import type { Conversation } from "../conversations/model";
import type { FollowUp } from "../follow-ups/model";
import { leadPriorities, type Lead, type LeadPriority } from "../leads/model";

export const aiOperationTypes = [
  "ANALYZE_CONVERSATION",
  "QUALIFY_LEAD",
  "DRAFT_RESPONSE",
  "RECOMMEND_FOLLOW_UP",
  "CLASSIFY_LEAD",
  "SUMMARIZE_ACTIVITY",
  "TRIGGER_WORKFLOW",
  "OTHER",
] as const;
export type AIOperationType = (typeof aiOperationTypes)[number];

export const aiOperationStatuses = [
  "QUEUED",
  "RUNNING",
  "NEEDS_REVIEW",
  "APPROVED",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;
export type AIOperationStatus = (typeof aiOperationStatuses)[number];

// AI work and leads share one operational urgency vocabulary.
export const aiOperationPriorities = leadPriorities;
export type AIOperationPriority = LeadPriority;

export const aiOperationSourceTypes = [
  "LEAD",
  "CONVERSATION",
  "FOLLOW_UP",
  "WORKFLOW",
] as const;
export type AIOperationSourceType = (typeof aiOperationSourceTypes)[number];

export type AIOperationSource =
  | Readonly<{ type: "LEAD"; resourceId: Lead["id"] }>
  | Readonly<{ type: "CONVERSATION"; resourceId: Conversation["id"] }>
  | Readonly<{ type: "FOLLOW_UP"; resourceId: FollowUp["id"] }>
  | Readonly<{ type: "WORKFLOW"; resourceId: string }>;

export type AIOperation = Readonly<{
  id: string;
  type: AIOperationType;
  status: AIOperationStatus;
  priority: AIOperationPriority;
  source: AIOperationSource;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  requiresHumanReview: boolean;
  assignedTo: string | null;
  aiSummary?: string;
  recommendation?: string;
  proposedAction?: string;
  policyResult?: string;
  executionResult?: string;
  completedAt?: string;
  failedAt?: string;
}>;

export const aiOperationViews = [
  { value: "ALL", label: "All" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
  { value: "RUNNING", label: "Running" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
] as const;
export type AIOperationView = (typeof aiOperationViews)[number]["value"];

export const aiOperationSortOptions = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "RECENTLY_UPDATED", label: "Recently updated" },
  { value: "PRIORITY", label: "Priority" },
] as const;
export type AIOperationSortOption =
  (typeof aiOperationSortOptions)[number]["value"];

export type AIOperationFilterState = Readonly<{
  statuses: readonly AIOperationStatus[];
  priorities: readonly AIOperationPriority[];
  sources: readonly AIOperationSourceType[];
  review: "ALL" | "REQUIRED" | "NOT_REQUIRED";
  sort: AIOperationSortOption;
}>;

export const initialAIOperationFilterState: AIOperationFilterState = {
  statuses: [],
  priorities: [],
  sources: [],
  review: "ALL",
  sort: "NEWEST",
};

export const emptyAIOperations: readonly AIOperation[] = [];

export const aiOperationSummaryItems = [
  { label: "AI tasks", description: "All proposed operational work" },
  { label: "Needs review", description: "Actions awaiting a person" },
  { label: "Running", description: "Work in controlled execution" },
  { label: "Completed", description: "Finished, recorded actions" },
] as const;

export const aiOperationTypeLabels: Readonly<Record<AIOperationType, string>> =
  {
    ANALYZE_CONVERSATION: "Analyze conversation",
    QUALIFY_LEAD: "Qualify lead",
    DRAFT_RESPONSE: "Draft response",
    RECOMMEND_FOLLOW_UP: "Recommend follow-up",
    CLASSIFY_LEAD: "Classify lead",
    SUMMARIZE_ACTIVITY: "Summarize activity",
    TRIGGER_WORKFLOW: "Trigger workflow",
    OTHER: "Other",
  };

export const AI_CONFIGURATION_UNAVAILABLE_MESSAGE =
  "AI configuration will be available when the AI operations engine is connected.";

export const AI_CONTROL_GROUPS = [
  {
    label: "AI",
    actions: ["Understand", "Summarize", "Classify", "Recommend", "Draft"],
  },
  {
    label: "Policy",
    actions: ["Validate rules", "Check risk", "Route decision"],
  },
  { label: "Human", actions: ["Approve", "Override", "Decide", "Escalate"] },
  {
    label: "System",
    actions: ["Enforce policy", "Execute approved action", "Record audit"],
  },
] as const;

export const AI_CONTEXT_CONNECTIONS = [
  {
    label: "Lead",
    href: "/leads",
    description: "Qualification and next-action context",
  },
  {
    label: "Conversation",
    href: "/inbox",
    description: "Intent and response context",
  },
  {
    label: "Follow-up",
    href: "/follow-ups",
    description: "Timing and action context",
  },
  {
    label: "Workflow",
    href: "/workflows",
    description: "Controlled execution context",
  },
] as const;

export function toggleAIOperationFilterValue<T extends string>(
  values: readonly T[],
  value: T,
): readonly T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export function getActiveAIOperationFilterCount(
  filters: AIOperationFilterState,
) {
  return (
    filters.statuses.length +
    filters.priorities.length +
    filters.sources.length +
    (filters.review === "ALL" ? 0 : 1)
  );
}

export function getAIOperationEmptyState(
  query: string,
  filters: AIOperationFilterState,
  view: AIOperationView,
) {
  if (query.trim()) {
    return {
      title: "No AI operations match your search.",
      description:
        "Try another title or source when the operations engine is connected.",
    };
  }
  if (getActiveAIOperationFilterCount(filters)) {
    return {
      title: "No AI operations match these filters.",
      description:
        "Clear one or more filters to return to the complete AI queue.",
    };
  }
  if (view !== "ALL") {
    const label = aiOperationViews.find((item) => item.value === view)?.label;
    return {
      title: `No ${label?.toLowerCase()} AI operations`,
      description:
        "This view will update when the AI operations engine is connected.",
    };
  }
  return {
    title: "No AI operations yet",
    description:
      "AI-assisted work will appear here when the operations engine is connected.",
  };
}
