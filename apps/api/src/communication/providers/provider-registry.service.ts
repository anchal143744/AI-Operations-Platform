import { Injectable } from "@nestjs/common";
import type {
  CommunicationProvider,
  ConversationChannel,
} from "@prisma/client";
import { CommunicationError } from "../communication.errors.js";
import type { CommunicationProviderAdapter } from "./communication-provider.interface.js";
import { TestCommunicationProvider } from "./test-communication.provider.js";

@Injectable()
export class ProviderRegistryService {
  private readonly providers: readonly CommunicationProviderAdapter[] = [
    new TestCommunicationProvider(),
  ];

  resolve(provider: CommunicationProvider, channel: ConversationChannel) {
    const adapter = this.providers.find(
      (candidate) => candidate.provider === provider,
    );
    if (!adapter)
      throw new CommunicationError(
        "UNSUPPORTED_PROVIDER",
        "Unsupported provider.",
      );
    if (!adapter.channels.includes(channel)) {
      throw new CommunicationError(
        "UNSUPPORTED_CHANNEL",
        "Unsupported provider channel.",
      );
    }
    return adapter;
  }
}
