import type {
  CommunicationProvider as ProviderName,
  ConversationChannel,
  ProviderWebhookEventType,
} from "@prisma/client";

export type ProviderSendRequest = Readonly<{
  messageId: string;
  channel: ConversationChannel;
  content: string;
  idempotencyKey: string;
  signal?: AbortSignal;
}>;

export type ProviderSendResult = Readonly<{
  providerMessageId: string;
  accepted: true;
}>;

export type NormalizedWebhookEvent = Readonly<{
  providerEventId: string;
  providerMessageId?: string;
  type: ProviderWebhookEventType;
}>;

export interface CommunicationProviderAdapter {
  readonly provider: ProviderName;
  readonly channels: readonly ConversationChannel[];
  /** Whether repeating a send with the same key is guaranteed not to duplicate delivery. */
  readonly supportsIdempotentSend: boolean;
  send(request: ProviderSendRequest): Promise<ProviderSendResult>;
  verifyWebhook(signature: string | undefined, payload: unknown): boolean;
  normalizeWebhook(payload: unknown): NormalizedWebhookEvent;
}
