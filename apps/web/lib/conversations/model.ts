import {
  conversationAttentionStates,
  conversationChannels,
  conversationStatuses,
  messageDirections,
  messageSenderTypes,
  messageStatuses,
  type ConversationAttentionState,
  type ConversationChannel,
  type ConversationMessageRecord,
  type ConversationRecord,
  type ConversationStatus,
  type MessageDirection,
  type MessageSenderType,
  type MessageStatus,
} from "@aop/types";
import type { Lead, LeadPriority, LeadStatus } from "../leads/model";

export {
  conversationAttentionStates,
  conversationChannels,
  conversationStatuses,
  messageDirections,
  messageSenderTypes,
  messageStatuses,
};
export type {
  ConversationAttentionState,
  ConversationChannel,
  ConversationStatus,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
};

export const conversationSortOptions = [
  { value: "NEWEST_ACTIVITY", label: "Newest activity" },
  { value: "OLDEST_ACTIVITY", label: "Oldest activity" },
  { value: "UNREAD_FIRST", label: "Unread first" },
  { value: "ATTENTION_REQUIRED", label: "Attention required" },
] as const;

export type ConversationSortOption =
  (typeof conversationSortOptions)[number]["value"];

export type Conversation = ConversationRecord &
  Readonly<{
    aiSummary?: string;
    sentiment?: string;
    intent?: string;
    nextAction?: string;
  }>;
export type ConversationMessage = ConversationMessageRecord;

export const conversationActivityTypes = [
  "AI_ANALYSIS",
  "HUMAN_REVIEW",
  "STATUS_CHANGE",
  "FOLLOW_UP",
  "MESSAGE_SENT",
] as const;

export type ConversationActivityType =
  (typeof conversationActivityTypes)[number];

export type ConversationActivity = Readonly<{
  id: string;
  conversationId: Conversation["id"];
  type: ConversationActivityType;
  occurredAt: string;
  summary: string;
}>;

export type ConversationDetail = Readonly<{
  conversation: Conversation;
  messages: readonly ConversationMessage[];
  lead: Lead | null;
  operationalActivity: readonly ConversationActivity[];
}>;

export type ConversationLeadContext = Readonly<{
  leadId: Lead["id"];
  status: LeadStatus;
  priority: LeadPriority;
}>;

export type ConversationFilterState = Readonly<{
  statuses: readonly ConversationStatus[];
  channels: readonly ConversationChannel[];
  attentionStates: readonly ConversationAttentionState[];
  owners: readonly "UNASSIGNED"[];
  sort: ConversationSortOption;
}>;

export const initialConversationFilterState: ConversationFilterState = {
  statuses: [],
  channels: [],
  attentionStates: [],
  owners: [],
  sort: "NEWEST_ACTIVITY",
};

export const emptyConversations: readonly Conversation[] = [];

export const conversationChannelLabels: Readonly<
  Record<ConversationChannel, string>
> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  EMAIL: "Email",
  SMS: "SMS",
  WEB_CHAT: "Web chat",
  PHONE: "Phone",
  WEBSITE: "Website",
  OTHER: "Other",
};

export const conversationStatusLabels: Readonly<
  Record<ConversationStatus, string>
> = {
  OPEN: "Open",
  WAITING: "Waiting",
  RESOLVED: "Resolved",
  ARCHIVED: "Archived",
};

export const conversationAttentionLabels: Readonly<
  Record<ConversationAttentionState, string>
> = {
  NONE: "No attention required",
  HUMAN_REQUIRED: "Human attention required",
  AI_REVIEW_REQUIRED: "AI review required",
  FOLLOW_UP_DUE: "Follow-up due",
};

export const NEW_CONVERSATION_UNAVAILABLE_MESSAGE =
  "Conversation creation will be available when communication channels are connected.";

export const CHANNEL_CONNECTION_UNAVAILABLE_MESSAGE =
  "Channel connections will be available in a future phase.";

export const CONVERSATION_ACTION_UNAVAILABLE_MESSAGE =
  "This conversation action will be available when the workspace is connected.";

export const MESSAGING_UNAVAILABLE_MESSAGE =
  "Messaging will be available when a communication channel is connected.";

export const CONVERSATION_FOLLOW_UP_UNAVAILABLE_MESSAGE =
  "Follow-up scheduling will be available when workflow and communication services are connected.";

export const conversationContextAreas = [
  {
    label: "Lead relationship",
    icon: "target",
    description: "Lead context will appear after a conversation is linked.",
  },
  {
    label: "AI assistance",
    icon: "spark",
    description:
      "Summaries and suggested responses will appear after processing is connected.",
  },
  {
    label: "Human review",
    icon: "user-check",
    description:
      "Policy-controlled review will appear when an action needs approval.",
  },
  {
    label: "Follow-up",
    icon: "repeat",
    description:
      "Due dates and follow-up state will appear when workflows are connected.",
  },
] as const;

export function toggleConversationFilterValue<T extends string>(
  values: readonly T[],
  value: T,
): readonly T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export function getActiveConversationFilterCount(
  filters: ConversationFilterState,
) {
  return (
    filters.statuses.length +
    filters.channels.length +
    filters.attentionStates.length +
    filters.owners.length
  );
}

export function getConversationEmptyState(
  query: string,
  filters: ConversationFilterState,
): Readonly<{ title: string; description: string }> {
  if (query.trim().length > 0) {
    return {
      title: "No conversations match your search.",
      description:
        "Try another participant, company, subject or conversation ID when communication data is connected.",
    };
  }

  if (getActiveConversationFilterCount(filters) > 0) {
    return {
      title: "No conversations match these filters.",
      description:
        "Clear one or more filters to return to the complete inbox workspace.",
    };
  }

  return {
    title: "No conversations yet",
    description:
      "Customer messages will appear here when your communication channels are connected.",
  };
}
