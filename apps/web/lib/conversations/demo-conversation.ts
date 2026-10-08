import { demoLeadDetail } from "../leads/demo-lead";
import type { ConversationDetail } from "./model";

export const DEMO_CONVERSATION_ID = "demo-conversation-001";

export const demoConversationDetail: ConversationDetail = {
  conversation: {
    id: DEMO_CONVERSATION_ID,
    leadId: demoLeadDetail.lead.id,
    channel: "WEBSITE",
    status: "OPEN",
    attentionState: "HUMAN_REQUIRED",
    subject: "Improving enquiry response time",
    participantName: "Jordan Lee",
    participantCompany: "Northstar Solutions",
    owner: "Demo Owner",
    createdAt: "2026-01-15T09:30:00.000Z",
    updatedAt: "2026-01-15T09:42:00.000Z",
    lastMessageAt: "2026-01-15T09:42:00.000Z",
    unreadCount: 1,
  },
  messages: [
    {
      id: "demo-message-001",
      conversationId: DEMO_CONVERSATION_ID,
      direction: "INBOUND",
      senderType: "CUSTOMER",
      content:
        "Hi, I'm interested in learning how your platform could help us handle incoming enquiries.",
      createdAt: "2026-01-15T09:30:00.000Z",
      status: "SENT",
    },
    {
      id: "demo-message-002",
      conversationId: DEMO_CONVERSATION_ID,
      direction: "OUTBOUND",
      senderType: "HUMAN",
      content:
        "Thanks for reaching out. I'd be happy to help understand your current process.",
      createdAt: "2026-01-15T09:36:00.000Z",
      status: "SENT",
    },
    {
      id: "demo-message-003",
      conversationId: DEMO_CONVERSATION_ID,
      direction: "INBOUND",
      senderType: "CUSTOMER",
      content:
        "We currently manage enquiries manually and want to improve response time.",
      createdAt: "2026-01-15T09:42:00.000Z",
      status: "SENT",
    },
  ],
  lead: demoLeadDetail.lead,
  operationalActivity: [],
};

export function getDemoConversationDetail(
  conversationId: string,
): ConversationDetail | null {
  return conversationId === DEMO_CONVERSATION_ID
    ? demoConversationDetail
    : null;
}
