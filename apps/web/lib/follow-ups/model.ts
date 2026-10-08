import {
  followUpStatuses,
  followUpTypes,
  type FollowUpRecord,
  type FollowUpStatus,
  type FollowUpType,
} from "@aop/types";
import type { Conversation } from "../conversations/model";
import {
  leadPriorities,
  leadPriorityLabels,
  type Lead,
  type LeadPriority,
} from "../leads/model";

export { followUpStatuses, followUpTypes };
export type { FollowUpStatus, FollowUpType };

// Follow-ups and leads use the same operational urgency scale by design.
export const followUpPriorities = leadPriorities;
export type FollowUpPriority = LeadPriority;

export const followUpViews = [
  { value: "ALL", label: "All" },
  { value: "DUE_TODAY", label: "Due today" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "COMPLETED", label: "Completed" },
] as const;

export type FollowUpView = (typeof followUpViews)[number]["value"];

export const followUpSortOptions = [
  { value: "DUE_SOONEST", label: "Due soonest" },
  { value: "DUE_LATEST", label: "Due latest" },
  { value: "PRIORITY_HIGHEST", label: "Priority highest" },
  { value: "RECENTLY_CREATED", label: "Recently created" },
] as const;

export type FollowUpSortOption = (typeof followUpSortOptions)[number]["value"];

export const followUpDateFilters = [
  { value: "ANY", label: "Any date" },
  { value: "DUE_TODAY", label: "Due today" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "OVERDUE", label: "Overdue" },
] as const;

export type FollowUpDateFilter = (typeof followUpDateFilters)[number]["value"];

export type FollowUp = FollowUpRecord &
  Readonly<{
    completedBy?: string;
    outcome?: string;
    nextAction?: string;
    automationSource?: string;
    aiRecommended?: boolean;
  }>;

export type FollowUpContext = Readonly<{
  followUp: FollowUp;
  lead: Lead | null;
  conversation: Conversation | null;
}>;

export type FollowUpFilterState = Readonly<{
  statuses: readonly FollowUpStatus[];
  priorities: readonly FollowUpPriority[];
  types: readonly FollowUpType[];
  owners: readonly "UNASSIGNED"[];
  date: FollowUpDateFilter;
  sort: FollowUpSortOption;
}>;

export const initialFollowUpFilterState: FollowUpFilterState = {
  statuses: [],
  priorities: [],
  types: [],
  owners: [],
  date: "ANY",
  sort: "DUE_SOONEST",
};

export const followUpStatusLabels: Readonly<Record<FollowUpStatus, string>> = {
  PENDING: "Pending",
  DUE: "Due",
  OVERDUE: "Overdue",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const followUpPriorityLabels = leadPriorityLabels;

export const followUpTypeLabels: Readonly<Record<FollowUpType, string>> = {
  CALL: "Call",
  EMAIL: "Email",
  MESSAGE: "Message",
  MEETING: "Meeting",
  TASK: "Task",
  OTHER: "Other",
};

export const followUpSummaryItems = [
  {
    label: "Due today",
    view: "DUE_TODAY",
    description: "Actions requiring attention now",
  },
  {
    label: "Upcoming",
    view: "UPCOMING",
    description: "Scheduled next actions",
  },
  {
    label: "Overdue",
    view: "OVERDUE",
    description: "Actions beyond their due time",
  },
  {
    label: "Completed",
    view: "COMPLETED",
    description: "Recorded follow-up outcomes",
  },
] as const satisfies readonly {
  label: string;
  view: Exclude<FollowUpView, "ALL">;
  description: string;
}[];

export const FOLLOW_UP_AI_UNAVAILABLE_MESSAGE =
  "AI-powered follow-up recommendations will appear when conversation intelligence is connected.";

export const followUpOperationalFlow = [
  { label: "Lead", icon: "target" },
  { label: "Conversation", icon: "inbox" },
  { label: "Next action", icon: "clock" },
  { label: "Follow-up", icon: "repeat" },
  { label: "Outcome", icon: "check" },
] as const;

export const followUpAutomationFlow = [
  "Trigger",
  "AI decision",
  "Policy check",
  "Follow-up",
  "Human approval where required",
  "Communication",
  "Outcome",
] as const;

export function toggleFollowUpFilterValue<T extends string>(
  values: readonly T[],
  value: T,
): readonly T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export function getActiveFollowUpFilterCount(filters: FollowUpFilterState) {
  return (
    filters.statuses.length +
    filters.priorities.length +
    filters.types.length +
    filters.owners.length +
    (filters.date === "ANY" ? 0 : 1)
  );
}

export function getFollowUpEmptyState(
  query: string,
  filters: FollowUpFilterState,
  view: FollowUpView,
): Readonly<{ title: string; description: string }> {
  if (query.trim().length > 0) {
    return {
      title: "No follow-ups match your search.",
      description: "Try another title or clear your search.",
    };
  }

  if (getActiveFollowUpFilterCount(filters) > 0) {
    return {
      title: "No follow-ups match these filters.",
      description:
        "Clear one or more filters to return to the complete follow-up queue.",
    };
  }

  if (view !== "ALL") {
    const label = followUpViews.find((item) => item.value === view)?.label;
    return {
      title: `No ${label?.toLowerCase()} follow-ups`,
      description: "There are no scheduled actions in this view.",
    };
  }

  return {
    title: "No follow-ups yet",
    description:
      "Scheduled customer actions will appear here so your team knows what needs attention next.",
  };
}
