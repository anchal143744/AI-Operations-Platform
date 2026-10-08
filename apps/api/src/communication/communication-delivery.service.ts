import { Injectable } from "@nestjs/common";
import {
  ActivityEventType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
  Prisma,
  ProviderConfigurationStatus,
  type Message,
} from "@prisma/client";
import type { ConversationMessageRecord } from "@aop/types";
import { ActivityEventService } from "../activity/activity.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { OutboxService } from "../outbox/outbox.service.js";
import {
  tenantOwnedWhere,
  type VerifiedTenantScope,
} from "../tenancy/tenant-scope.js";
import { conversationNotFound } from "../conversations/conversations.errors.js";
import type { SubmitOutboundMessageDto } from "./communication.dto.js";
import {
  duplicateIdempotencyKey,
  providerNotConfigured,
} from "./communication.errors.js";

function present(message: Message): ConversationMessageRecord {
  return {
    id: message.id,
    conversationId: message.conversationId,
    direction: message.direction,
    senderType: message.senderType,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    status: message.status,
  };
}

@Injectable()
export class CommunicationDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityEventService,
    private readonly outbox: OutboxService,
  ) {}

  async submit(
    scope: VerifiedTenantScope,
    conversationId: string,
    input: SubmitOutboundMessageDto,
  ): Promise<ConversationMessageRecord> {
    const existing = await this.prisma.message.findFirst({
      where: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        idempotencyKey: input.idempotencyKey,
      },
    });
    if (existing) return this.presentMatching(existing, conversationId, input);

    const conversation = await this.prisma.conversation.findFirst({
      where: tenantOwnedWhere(scope, conversationId),
      select: { id: true, channel: true },
    });
    if (!conversation) throw conversationNotFound();

    const configuration = await this.prisma.providerConfiguration.findFirst({
      where: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        channel: conversation.channel,
        status: ProviderConfigurationStatus.ACTIVE,
      },
    });
    if (!configuration) throw providerNotConfigured();
    let queued: Message;
    try {
      queued = await this.prisma.$transaction(async (database) => {
        const message = await database.message.create({
          data: {
            organizationId: scope.organizationId,
            workspaceId: scope.workspaceId,
            conversationId,
            senderMembershipId: scope.membershipId,
            direction: MessageDirection.OUTBOUND,
            senderType: MessageSenderType.HUMAN,
            content: input.content,
            channel: conversation.channel,
            provider: configuration.provider,
            idempotencyKey: input.idempotencyKey,
            status: MessageStatus.QUEUED,
          },
        });
        await this.outbox.enqueueMessage(
          scope,
          { messageId: message.id, idempotencyKey: input.idempotencyKey },
          database,
        );
        await this.activity.recordUser(
          scope,
          {
            eventType: ActivityEventType.MESSAGE_QUEUED,
            action: "message.queued",
            summary: "An outbound message was queued for durable delivery.",
            resourceType: "MESSAGE",
            resourceId: message.id,
            conversationId,
          },
          database,
        );
        return message;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const concurrent = await this.prisma.message.findFirst({
          where: {
            organizationId: scope.organizationId,
            workspaceId: scope.workspaceId,
            idempotencyKey: input.idempotencyKey,
          },
        });
        if (concurrent) {
          return this.presentMatching(concurrent, conversationId, input);
        }
      }
      throw error;
    }
    return present(queued);
  }

  private presentMatching(
    existing: Message,
    conversationId: string,
    input: SubmitOutboundMessageDto,
  ) {
    if (
      existing.conversationId !== conversationId ||
      existing.content !== input.content
    ) {
      throw duplicateIdempotencyKey();
    }
    return present(existing);
  }
}
