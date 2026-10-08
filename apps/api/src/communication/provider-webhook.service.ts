import { Injectable } from "@nestjs/common";
import {
  ActivityEventType,
  CommunicationProvider,
  ConversationChannel,
  MessageStatus,
  ProviderConfigurationStatus,
  ProviderWebhookEventType,
} from "@prisma/client";
import { ActivityEventService } from "../activity/activity.service.js";
import { PrismaService } from "../database/prisma.service.js";
import { CommunicationError } from "./communication.errors.js";
import { assertMessageTransition } from "./message-lifecycle.js";
import { ProviderRegistryService } from "./providers/provider-registry.service.js";

const targetStatus: Partial<Record<ProviderWebhookEventType, MessageStatus>> = {
  MESSAGE_ACCEPTED: MessageStatus.PROVIDER_ACCEPTED,
  MESSAGE_DELIVERED: MessageStatus.DELIVERED,
  MESSAGE_READ: MessageStatus.READ,
  MESSAGE_FAILED: MessageStatus.FAILED,
};

@Injectable()
export class ProviderWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providers: ProviderRegistryService,
    private readonly activity: ActivityEventService,
  ) {}

  async ingest(
    input: Readonly<{
      provider: CommunicationProvider;
      channel: ConversationChannel;
      publicReference: string;
      signature?: string;
      payload: unknown;
    }>,
  ) {
    const configuration = await this.prisma.providerConfiguration.findFirst({
      where: {
        publicReference: input.publicReference,
        provider: input.provider,
        channel: input.channel,
        status: ProviderConfigurationStatus.ACTIVE,
      },
    });
    if (!configuration) {
      throw new CommunicationError(
        "PROVIDER_NOT_CONFIGURED",
        "Provider configuration was not found.",
      );
    }
    const adapter = this.providers.resolve(input.provider, input.channel);
    if (!adapter.verifyWebhook(input.signature, input.payload)) {
      throw new CommunicationError(
        "WEBHOOK_VERIFICATION_FAILED",
        "Webhook verification failed.",
      );
    }
    const event = adapter.normalizeWebhook(input.payload);
    const duplicate = await this.prisma.providerWebhookEvent.findUnique({
      where: {
        providerConfigurationId_providerEventId: {
          providerConfigurationId: configuration.id,
          providerEventId: event.providerEventId,
        },
      },
    });
    if (duplicate) return { duplicate: true as const, eventId: duplicate.id };

    const receipt = await this.prisma.$transaction(async (database) => {
      const created = await database.providerWebhookEvent.create({
        data: {
          organizationId: configuration.organizationId,
          workspaceId: configuration.workspaceId,
          providerConfigurationId: configuration.id,
          providerEventId: event.providerEventId,
          eventType: event.type,
        },
      });
      if (event.providerMessageId && targetStatus[event.type]) {
        const message = await database.message.findFirst({
          where: {
            organizationId: configuration.organizationId,
            workspaceId: configuration.workspaceId,
            provider: configuration.provider,
            providerMessageId: event.providerMessageId,
          },
        });
        if (message) {
          const next = targetStatus[event.type]!;
          assertMessageTransition(message.status, next);
          await database.message.update({
            where: { id: message.id },
            data: {
              status: next,
              ...(next === MessageStatus.DELIVERED
                ? { deliveredAt: new Date() }
                : {}),
              ...(next === MessageStatus.FAILED
                ? {
                    failedAt: new Date(),
                    failureCode: "PROVIDER_REPORTED_FAILURE",
                  }
                : {}),
            },
          });
          await this.activity.recordProvider(
            configuration,
            {
              eventType:
                next === MessageStatus.DELIVERED
                  ? ActivityEventType.MESSAGE_DELIVERED
                  : next === MessageStatus.FAILED
                    ? ActivityEventType.MESSAGE_FAILED
                    : ActivityEventType.WEBHOOK_RECEIVED,
              action: `message.${next.toLowerCase()}`,
              summary:
                "A verified provider event updated message delivery state.",
              resourceType: "MESSAGE",
              resourceId: message.id,
              conversationId: message.conversationId,
            },
            database,
          );
        }
      }
      return created;
    });
    return { duplicate: false as const, eventId: receipt.id };
  }
}
