import { ConflictException, Injectable } from "@nestjs/common";
import {
  ActivityEventType,
  MessageStatus,
  OutboxEventStatus,
  OutboxEventType,
  ProviderConfigurationStatus,
  type OutboxEvent,
} from "@prisma/client";
import { ActivityEventService } from "../activity/activity.service.js";
import { CommunicationError } from "../communication/communication.errors.js";
import { assertMessageTransition } from "../communication/message-lifecycle.js";
import type { ProviderSendResult } from "../communication/providers/communication-provider.interface.js";
import { ProviderRegistryService } from "../communication/providers/provider-registry.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { WorkflowControlService } from "../workflow-control/workflow-control.service.js";
import { OutboxService } from "./outbox.service.js";

class OutboxLeaseLostError extends Error {}
const PROVIDER_SEND_TIMEOUT_MS = 30_000;

@Injectable()
export class OutboxWorkerService {
  private lastMaintenanceAt = 0;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    private readonly providers: ProviderRegistryService,
    private readonly activity: ActivityEventService,
    private readonly workflows: WorkflowControlService,
  ) {}

  async processNext(now = new Date()) {
    if (now.getTime() - this.lastMaintenanceAt >= 60_000) {
      await this.workflows.expireApprovals(now);
      await this.workflows.recoverStaleExecutions(now);
      this.lastMaintenanceAt = now.getTime();
    }
    const event = await this.outbox.claimNext(now);
    if (!event) return { processed: false as const };
    if (
      event.eventType === OutboxEventType.WORKFLOW_DRY_RUN ||
      event.eventType === OutboxEventType.WORKFLOW_INTERNAL_NOTIFICATION
    ) {
      if (event.exhausted) {
        const status = await this.workflows.failWorkflowAction(event, now);
        return {
          processed: true as const,
          status,
        };
      }
      try {
        const completed = await this.workflows.processWorkflowAction(
          event,
          now,
        );
        const status = completed
          ? OutboxEventStatus.COMPLETED
          : await this.workflows.failWorkflowAction(event, now);
        return {
          processed: true as const,
          status,
        };
      } catch (error) {
        const status = await this.workflows.failWorkflowAction(
          event,
          now,
          !(error instanceof ConflictException),
        );
        return {
          processed: true as const,
          status,
        };
      }
    }
    if (event.eventType !== OutboxEventType.SEND_MESSAGE || !event.messageId) {
      await this.failPermanently(
        event.id,
        event.lockToken!,
        "UNSUPPORTED_OUTBOX_EVENT",
        now,
      );
      return { processed: true as const, status: OutboxEventStatus.FAILED };
    }
    let providerCallStarted = false;
    let providerSupportsIdempotentSend = true;
    try {
      const message = await this.prisma.message.findFirst({
        where: {
          id: event.messageId,
          organizationId: event.organizationId,
          workspaceId: event.workspaceId,
        },
      });
      if (!message?.provider || !message.channel || !message.idempotencyKey) {
        throw new CommunicationError(
          "DELIVERY_FAILED",
          "Queued message data is incomplete.",
        );
      }
      if (event.exhausted) {
        // The final in-flight attempt lost its lease. Even an idempotent
        // adapter cannot prove whether the remote side accepted that attempt.
        const owned =
          message.status === MessageStatus.SUBMITTED
            ? await this.finalizeUncertain(event, now)
            : await this.finalizeFailure(event, "DELIVERY_FAILED", false, now);
        return {
          processed: true as const,
          status: owned ? OutboxEventStatus.FAILED : ("LEASE_LOST" as const),
        };
      }
      const adapter = this.providers.resolve(message.provider, message.channel);
      providerSupportsIdempotentSend = adapter.supportsIdempotentSend;
      if (
        event.reclaimed &&
        !adapter.supportsIdempotentSend &&
        message.status === MessageStatus.SUBMITTED
      ) {
        const owned = await this.finalizeUncertain(event, now);
        return {
          processed: true as const,
          status: owned ? OutboxEventStatus.FAILED : ("LEASE_LOST" as const),
        };
      }
      const configuration = await this.prisma.providerConfiguration.findFirst({
        where: {
          organizationId: event.organizationId,
          workspaceId: event.workspaceId,
          channel: message.channel,
          provider: message.provider,
          status: ProviderConfigurationStatus.ACTIVE,
        },
      });
      if (!configuration) {
        throw new CommunicationError(
          "PROVIDER_NOT_CONFIGURED",
          "Provider configuration is unavailable.",
        );
      }
      await this.prisma.$transaction(async (database) => {
        const current = await database.message.findFirstOrThrow({
          where: {
            id: message.id,
            organizationId: event.organizationId,
            workspaceId: event.workspaceId,
          },
        });
        let shouldRecordSubmission = false;
        if (current.status === MessageStatus.FAILED) {
          assertMessageTransition(current.status, MessageStatus.QUEUED);
          await database.message.update({
            where: { id: current.id },
            data: {
              status: MessageStatus.QUEUED,
              failedAt: null,
              failureCode: null,
            },
          });
          shouldRecordSubmission = true;
        } else if (current.status === MessageStatus.QUEUED) {
          shouldRecordSubmission = true;
        } else if (current.status !== MessageStatus.SUBMITTED) {
          assertMessageTransition(current.status, MessageStatus.SUBMITTED);
        }
        if (shouldRecordSubmission) {
          await database.message.update({
            where: { id: current.id },
            data: { status: MessageStatus.SUBMITTED, submittedAt: now },
          });
          await this.activity.recordSystem(
            event,
            {
              eventType: ActivityEventType.MESSAGE_SUBMITTED,
              action: "message.submitted",
              summary: "The delivery worker submitted an outbound message.",
              resourceType: "MESSAGE",
              resourceId: current.id,
              conversationId: current.conversationId,
            },
            database,
          );
        }
      });

      const abort = new AbortController();
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const timeoutFailure = new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          abort.abort();
          reject(
            new CommunicationError(
              "DELIVERY_FAILED",
              "Provider delivery timed out.",
              true,
            ),
          );
        }, PROVIDER_SEND_TIMEOUT_MS);
      });
      let result: ProviderSendResult;
      try {
        providerCallStarted = true;
        result = await Promise.race([
          adapter.send({
            messageId: message.id,
            channel: message.channel,
            content: message.content,
            idempotencyKey: message.idempotencyKey,
            signal: abort.signal,
          }),
          timeoutFailure,
        ]);
      } finally {
        if (timeout) clearTimeout(timeout);
      }

      await this.prisma.$transaction(async (database) => {
        const owned = await database.outboxEvent.findFirst({
          where: {
            id: event.id,
            status: OutboxEventStatus.PROCESSING,
            lockToken: event.lockToken,
          },
        });
        if (!owned) throw new OutboxLeaseLostError();
        const current = await database.message.findFirstOrThrow({
          where: {
            id: message.id,
            organizationId: event.organizationId,
            workspaceId: event.workspaceId,
          },
        });
        assertMessageTransition(
          current.status,
          MessageStatus.PROVIDER_ACCEPTED,
        );
        await database.message.update({
          where: { id: message.id },
          data: {
            status: MessageStatus.PROVIDER_ACCEPTED,
            providerMessageId: result.providerMessageId,
          },
        });
        await this.activity.recordProvider(
          event,
          {
            eventType: ActivityEventType.MESSAGE_DELIVERY_ACCEPTED,
            action: "message.delivery_accepted",
            summary: "The configured provider accepted an outbound message.",
            resourceType: "MESSAGE",
            resourceId: message.id,
            conversationId: message.conversationId,
          },
          database,
        );
        await database.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: OutboxEventStatus.COMPLETED,
            completedAt: now,
            lockedAt: null,
            lockToken: null,
            lastErrorCode: null,
          },
        });
      });
      return { processed: true as const, status: OutboxEventStatus.COMPLETED };
    } catch (error) {
      if (error instanceof OutboxLeaseLostError) {
        return { processed: true as const, status: "LEASE_LOST" as const };
      }
      const communication =
        error instanceof CommunicationError
          ? error
          : new CommunicationError(
              "DELIVERY_FAILED",
              "Delivery processing failed.",
              true,
            );
      if (
        providerCallStarted &&
        !providerSupportsIdempotentSend &&
        communication.code !== "PROVIDER_REJECTED"
      ) {
        const owned = await this.finalizeUncertain(event, now);
        return {
          processed: true as const,
          status: owned ? OutboxEventStatus.FAILED : ("LEASE_LOST" as const),
        };
      }
      const retryable =
        communication.retryable && event.attempts < event.maxAttempts;
      const owned = await this.finalizeFailure(
        event,
        communication.code,
        retryable,
        now,
      );
      return {
        processed: true as const,
        status: !owned
          ? ("LEASE_LOST" as const)
          : retryable
            ? OutboxEventStatus.PENDING
            : OutboxEventStatus.FAILED,
      };
    }
  }

  private finalizeUncertain(event: OutboxEvent, now: Date) {
    return this.prisma.$transaction(async (database) => {
      const updated = await database.outboxEvent.updateMany({
        where: {
          id: event.id,
          status: OutboxEventStatus.PROCESSING,
          lockToken: event.lockToken,
        },
        data: {
          status: OutboxEventStatus.FAILED,
          nextAttemptAt: now,
          lockedAt: null,
          lockToken: null,
          lastErrorCode: "DELIVERY_OUTCOME_UNKNOWN",
        },
      });
      if (updated.count === 0) return false;
      if (!event.messageId) return true;
      const message = await database.message.findFirst({
        where: {
          id: event.messageId,
          organizationId: event.organizationId,
          workspaceId: event.workspaceId,
          status: MessageStatus.SUBMITTED,
        },
      });
      if (message) {
        await this.activity.recordSystem(
          event,
          {
            eventType: ActivityEventType.MESSAGE_DELIVERY_UNCERTAIN,
            action: "message.delivery_uncertain",
            summary:
              "The provider response was uncertain; manual reconciliation is required before another send.",
            resourceType: "MESSAGE",
            resourceId: message.id,
            conversationId: message.conversationId,
          },
          database,
        );
      }
      return true;
    });
  }

  private finalizeFailure(
    event: OutboxEvent,
    code: CommunicationError["code"],
    retryable: boolean,
    now: Date,
  ) {
    return this.prisma.$transaction(async (database) => {
      const updated = await database.outboxEvent.updateMany({
        where: {
          id: event.id,
          status: OutboxEventStatus.PROCESSING,
          lockToken: event.lockToken,
        },
        data: {
          status: retryable
            ? OutboxEventStatus.PENDING
            : OutboxEventStatus.FAILED,
          nextAttemptAt: retryable
            ? new Date(now.getTime() + this.outbox.retryDelayMs(event.attempts))
            : now,
          lockedAt: null,
          lockToken: null,
          lastErrorCode: code,
        },
      });
      if (updated.count === 0) return false;
      if (!event.messageId) return true;
      const message = await database.message.findFirst({
        where: {
          id: event.messageId,
          organizationId: event.organizationId,
          workspaceId: event.workspaceId,
        },
      });
      if (
        !message ||
        (message.status !== MessageStatus.QUEUED &&
          message.status !== MessageStatus.SUBMITTED)
      ) {
        return true;
      }
      assertMessageTransition(message.status, MessageStatus.FAILED);
      await database.message.update({
        where: { id: message.id },
        data: {
          status: MessageStatus.FAILED,
          failedAt: now,
          failureCode: code,
        },
      });
      await this.activity.recordSystem(
        event,
        {
          eventType: ActivityEventType.MESSAGE_FAILED,
          action: "message.failed",
          summary: retryable
            ? "Message delivery failed and is scheduled for bounded retry."
            : "Message delivery failed permanently.",
          resourceType: "MESSAGE",
          resourceId: message.id,
          conversationId: message.conversationId,
        },
        database,
      );
      return true;
    });
  }

  private async failPermanently(
    id: string,
    lockToken: string,
    code: string,
    now: Date,
  ) {
    await this.prisma.outboxEvent.updateMany({
      where: { id, status: OutboxEventStatus.PROCESSING, lockToken },
      data: {
        status: OutboxEventStatus.FAILED,
        nextAttemptAt: now,
        lockedAt: null,
        lockToken: null,
        lastErrorCode: code,
      },
    });
  }
}
