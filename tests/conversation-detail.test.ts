import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEMO_CONVERSATION_ID,
  demoConversationDetail,
  getDemoConversationDetail,
} from "../apps/web/lib/conversations/demo-conversation";
import {
  CONVERSATION_ACTION_UNAVAILABLE_MESSAGE,
  CONVERSATION_FOLLOW_UP_UNAVAILABLE_MESSAGE,
  conversationAttentionLabels,
  conversationChannelLabels,
  conversationStatusLabels,
  messageDirections,
  messageSenderTypes,
  messageStatuses,
  MESSAGING_UNAVAILABLE_MESSAGE,
} from "../apps/web/lib/conversations/model";
import { demoLeadDetail } from "../apps/web/lib/leads/demo-lead";

describe("conversation detail demo boundary", () => {
  it("resolves exactly one supported demo conversation", () => {
    expect(getDemoConversationDetail(DEMO_CONVERSATION_ID)).toBe(
      demoConversationDetail,
    );
    expect(getDemoConversationDetail("invalid")).toBeNull();
    expect(getDemoConversationDetail("")).toBeNull();
  });

  it("contains only the requested synthetic identity", () => {
    expect(demoConversationDetail.conversation).toMatchObject({
      id: "demo-conversation-001",
      participantName: "Jordan Lee",
      participantCompany: "Northstar Solutions",
      channel: "WEBSITE",
      status: "OPEN",
      attentionState: "HUMAN_REQUIRED",
      owner: "Demo Owner",
    });
  });

  it("renders a small fictional human and customer message set", () => {
    expect(demoConversationDetail.messages).toHaveLength(3);
    expect(
      demoConversationDetail.messages.map((message) => message.senderType),
    ).toEqual(["CUSTOMER", "HUMAN", "CUSTOMER"]);
    expect(
      demoConversationDetail.messages.every(
        (message) => message.conversationId === DEMO_CONVERSATION_ID,
      ),
    ).toBe(true);
    expect(
      demoConversationDetail.messages.some(
        (message) => message.senderType === "AI",
      ),
    ).toBe(false);
  });

  it("centralizes the future message contracts", () => {
    expect(messageDirections).toEqual(["INBOUND", "OUTBOUND"]);
    expect(messageSenderTypes).toEqual(["CUSTOMER", "HUMAN", "AI"]);
    expect(messageStatuses).toEqual([
      "DRAFT",
      "PENDING_REVIEW",
      "APPROVED",
      "SENT",
      "QUEUED",
      "SUBMITTED",
      "PROVIDER_ACCEPTED",
      "DELIVERED",
      "READ",
      "FAILED",
      "CANCELLED",
    ]);
  });

  it("uses centralized channel, status, and attention labels", () => {
    const conversation = demoConversationDetail.conversation;
    expect(conversationChannelLabels[conversation.channel]).toBe("Website");
    expect(conversationStatusLabels[conversation.status]).toBe("Open");
    expect(conversationAttentionLabels[conversation.attentionState]).toBe(
      "Human attention required",
    );
  });

  it("reuses the existing demo lead and leaves audit history empty", () => {
    expect(demoConversationDetail.lead).toBe(demoLeadDetail.lead);
    expect(demoConversationDetail.operationalActivity).toEqual([]);
  });
});

describe("conversation detail controlled states", () => {
  it("defines explicit unavailable action boundaries", () => {
    expect(CONVERSATION_ACTION_UNAVAILABLE_MESSAGE).toBe(
      "This conversation action will be available when the workspace is connected.",
    );
    expect(MESSAGING_UNAVAILABLE_MESSAGE).toBe(
      "Messaging will be available when a communication channel is connected.",
    );
    expect(CONVERSATION_FOLLOW_UP_UNAVAILABLE_MESSAGE).toContain(
      "workflow and communication services",
    );
  });

  it("renders AI, human-review, composer, and audit boundaries", () => {
    const readComponent = (name: string) =>
      readFileSync(
        fileURLToPath(
          new URL(
            `../apps/web/components/conversation-detail/${name}`,
            import.meta.url,
          ),
        ),
        "utf8",
      );

    expect(readComponent("conversation-ai-assistance.tsx")).toContain(
      "when conversation processing is connected",
    );
    expect(readComponent("conversation-human-review.tsx")).toContain(
      "Human review required",
    );
    expect(readComponent("message-composer.tsx")).toContain("disabled");
    expect(readComponent("conversation-activity.tsx")).toContain(
      "No operational activity recorded yet.",
    );
  });

  it("provides Inbox, conversation, and Lead navigation", () => {
    const source = (relativePath: string) =>
      readFileSync(
        fileURLToPath(new URL(relativePath, import.meta.url)),
        "utf8",
      );

    expect(
      source(
        "../apps/web/components/conversation-detail/conversation-header.tsx",
      ),
    ).toContain('href="/inbox"');
    expect(
      source(
        "../apps/web/components/conversation-detail/conversation-not-found.tsx",
      ),
    ).toContain('href="/inbox"');
    expect(
      source(
        "../apps/web/components/conversation-detail/conversation-lead-context.tsx",
      ),
    ).toContain("href={`/leads/${lead.id}`}");
    expect(
      source("../apps/web/components/inbox/conversation-empty-state.tsx"),
    ).toContain('href="/inbox/demo-conversation-001"');
    expect(
      source("../apps/web/components/lead-detail/lead-operational-status.tsx"),
    ).toContain('href="/inbox/demo-conversation-001"');
  });
});
