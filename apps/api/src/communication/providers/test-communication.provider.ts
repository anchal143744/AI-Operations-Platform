import {
  CommunicationProvider,
  ConversationChannel,
  ProviderWebhookEventType,
} from "@prisma/client";
import { createHash } from "node:crypto";
import { CommunicationError } from "../communication.errors.js";
import type {
  CommunicationProviderAdapter,
  NormalizedWebhookEvent,
  ProviderSendRequest,
  ProviderSendResult,
} from "./communication-provider.interface.js";

/** Deterministic TEST ONLY adapter. It never performs a network request. */
export class TestCommunicationProvider implements CommunicationProviderAdapter {
  readonly provider = CommunicationProvider.TEST;
  readonly supportsIdempotentSend = true;
  readonly channels = [
    ConversationChannel.EMAIL,
    ConversationChannel.WHATSAPP,
    ConversationChannel.INSTAGRAM,
    ConversationChannel.SMS,
    ConversationChannel.WEB_CHAT,
    ConversationChannel.WEBSITE,
  ] as const;

  constructor(
    private readonly failure: "NONE" | "RETRYABLE" | "PERMANENT" = "NONE",
  ) {}

  async send(request: ProviderSendRequest): Promise<ProviderSendResult> {
    if (this.failure === "RETRYABLE") {
      throw new CommunicationError(
        "DELIVERY_FAILED",
        "Temporary test-provider failure.",
        true,
      );
    }
    if (this.failure === "PERMANENT") {
      throw new CommunicationError(
        "PROVIDER_REJECTED",
        "Test provider rejected the operation.",
      );
    }
    return {
      providerMessageId: `test_${createHash("sha256").update(request.idempotencyKey).digest("hex").slice(0, 24)}`,
      accepted: true,
    };
  }

  verifyWebhook(signature: string | undefined): boolean {
    return signature === "test-only-valid";
  }

  normalizeWebhook(payload: unknown): NormalizedWebhookEvent {
    if (!payload || typeof payload !== "object") {
      throw new CommunicationError(
        "WEBHOOK_VERIFICATION_FAILED",
        "Invalid test webhook payload.",
      );
    }
    const value = payload as Record<string, unknown>;
    if (typeof value.eventId !== "string" || typeof value.type !== "string") {
      throw new CommunicationError(
        "WEBHOOK_VERIFICATION_FAILED",
        "Invalid test webhook payload.",
      );
    }
    if (
      !Object.values(ProviderWebhookEventType).includes(
        value.type as ProviderWebhookEventType,
      )
    ) {
      throw new CommunicationError(
        "WEBHOOK_VERIFICATION_FAILED",
        "Unsupported test webhook event.",
      );
    }
    return {
      providerEventId: value.eventId,
      type: value.type as ProviderWebhookEventType,
      ...(typeof value.providerMessageId === "string"
        ? { providerMessageId: value.providerMessageId }
        : {}),
    };
  }
}
