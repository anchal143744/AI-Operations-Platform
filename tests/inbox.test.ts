import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  CHANNEL_CONNECTION_UNAVAILABLE_MESSAGE,
  conversationAttentionStates,
  conversationChannels,
  conversationSortOptions,
  conversationStatuses,
  getActiveConversationFilterCount,
  getConversationEmptyState,
  initialConversationFilterState,
  NEW_CONVERSATION_UNAVAILABLE_MESSAGE,
  toggleConversationFilterValue,
} from "../apps/web/lib/conversations/model";

describe("conversation domain model", () => {
  it("centralizes channel, status, and attention values", () => {
    expect(conversationChannels).toEqual([
      "WHATSAPP",
      "INSTAGRAM",
      "EMAIL",
      "SMS",
      "WEB_CHAT",
      "PHONE",
      "WEBSITE",
      "OTHER",
    ]);
    expect(conversationStatuses).toEqual([
      "OPEN",
      "WAITING",
      "RESOLVED",
      "ARCHIVED",
    ]);
    expect(conversationAttentionStates).toEqual([
      "NONE",
      "HUMAN_REQUIRED",
      "AI_REVIEW_REQUIRED",
      "FOLLOW_UP_DUE",
    ]);
  });

  it("defines the requested conversation sort configuration", () => {
    expect(conversationSortOptions.map((option) => option.label)).toEqual([
      "Newest activity",
      "Oldest activity",
      "Unread first",
      "Attention required",
    ]);
  });

  it("updates multi-filter values without mutating the source", () => {
    const original = ["OPEN"] as const;
    expect(toggleConversationFilterValue(original, "WAITING")).toEqual([
      "OPEN",
      "WAITING",
    ]);
    expect(toggleConversationFilterValue(original, "OPEN")).toEqual([]);
    expect(original).toEqual(["OPEN"]);
  });

  it("counts active filters independently from sorting", () => {
    expect(
      getActiveConversationFilterCount({
        ...initialConversationFilterState,
        statuses: ["OPEN"],
        channels: ["EMAIL"],
        attentionStates: ["HUMAN_REQUIRED"],
        owners: ["UNASSIGNED"],
        sort: "ATTENTION_REQUIRED",
      }),
    ).toBe(4);
  });
});

describe("Inbox empty workspace", () => {
  it("provides distinct empty states for search and filters", () => {
    expect(
      getConversationEmptyState("Northstar", initialConversationFilterState)
        .title,
    ).toBe("No conversations match your search.");
    expect(
      getConversationEmptyState("", {
        ...initialConversationFilterState,
        channels: ["EMAIL"],
      }).title,
    ).toBe("No conversations match these filters.");
    expect(
      getConversationEmptyState("", initialConversationFilterState).title,
    ).toBe("No conversations yet");
  });

  it("uses explicit unavailable messages for creation and connections", () => {
    expect(NEW_CONVERSATION_UNAVAILABLE_MESSAGE).toBe(
      "Conversation creation will be available when communication channels are connected.",
    );
    expect(CHANNEL_CONNECTION_UNAVAILABLE_MESSAGE).toBe(
      "Channel connections will be available in a future phase.",
    );
  });

  it("loads the real tenant-scoped collection and keeps future context", () => {
    const componentPath = fileURLToPath(
      new URL("../apps/web/components/inbox/inbox-page.tsx", import.meta.url),
    );
    const panelPath = fileURLToPath(
      new URL(
        "../apps/web/components/inbox/conversation-panel.tsx",
        import.meta.url,
      ),
    );
    const source = readFileSync(componentPath, "utf8");
    const panelSource = readFileSync(panelPath, "utf8");
    expect(source).toMatch(/conversationsService\s*\.list/);
    expect(source).toContain("useWorkspaceContext");
    expect(panelSource).toContain("Select a conversation");
    expect(panelSource).toContain("ConversationContext");
    expect(source).not.toContain("participantName:");
  });
});
