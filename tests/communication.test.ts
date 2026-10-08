import {
  CommunicationProvider,
  ConversationChannel,
  MessageStatus,
  ProviderWebhookEventType,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import { CommunicationError } from "../apps/api/src/communication/communication.errors";
import {
  assertMessageTransition,
  messageLifecycle,
} from "../apps/api/src/communication/message-lifecycle";
import { ProviderRegistryService } from "../apps/api/src/communication/providers/provider-registry.service";
import { TestCommunicationProvider } from "../apps/api/src/communication/providers/test-communication.provider";

describe("communication provider foundation", () => {
  it("resolves only known provider/channel pairs", () => {
    const registry = new ProviderRegistryService();
    expect(
      registry.resolve(CommunicationProvider.TEST, ConversationChannel.EMAIL),
    ).toBeDefined();
    expect(() =>
      registry.resolve(
        "UNKNOWN" as CommunicationProvider,
        ConversationChannel.EMAIL,
      ),
    ).toThrowError(CommunicationError);
    expect(() =>
      registry.resolve(CommunicationProvider.TEST, ConversationChannel.PHONE),
    ).toThrowError(CommunicationError);
  });

  it("enforces one-way delivery lifecycle transitions", () => {
    expect(messageLifecycle.QUEUED).toContain(MessageStatus.SUBMITTED);
    expect(() =>
      assertMessageTransition(MessageStatus.QUEUED, MessageStatus.SUBMITTED),
    ).not.toThrow();
    expect(() =>
      assertMessageTransition(MessageStatus.DELIVERED, MessageStatus.QUEUED),
    ).toThrowError(CommunicationError);
  });

  it("uses a deterministic network-free test provider", async () => {
    const provider = new TestCommunicationProvider();
    const request = {
      messageId: "message",
      channel: ConversationChannel.EMAIL,
      content: "test",
      idempotencyKey: "same-key",
    };
    expect(await provider.send(request)).toEqual(await provider.send(request));
  });

  it("distinguishes retryable and permanent provider failures", async () => {
    await expect(
      new TestCommunicationProvider("RETRYABLE").send({
        messageId: "message",
        channel: ConversationChannel.EMAIL,
        content: "test",
        idempotencyKey: "retry",
      }),
    ).rejects.toMatchObject({ retryable: true, code: "DELIVERY_FAILED" });
    await expect(
      new TestCommunicationProvider("PERMANENT").send({
        messageId: "message",
        channel: ConversationChannel.EMAIL,
        content: "test",
        idempotencyKey: "permanent",
      }),
    ).rejects.toMatchObject({ retryable: false, code: "PROVIDER_REJECTED" });
  });

  it("rejects unsigned webhooks and normalizes verified test events", () => {
    const provider = new TestCommunicationProvider();
    expect(provider.verifyWebhook(undefined, {})).toBe(false);
    expect(provider.verifyWebhook("test-only-valid", {})).toBe(true);
    expect(
      provider.normalizeWebhook({
        eventId: "event-1",
        providerMessageId: "provider-1",
        type: ProviderWebhookEventType.MESSAGE_DELIVERED,
      }),
    ).toMatchObject({
      providerEventId: "event-1",
      type: ProviderWebhookEventType.MESSAGE_DELIVERED,
    });
  });
});
