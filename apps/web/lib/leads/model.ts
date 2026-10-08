import {
  leadPriorities,
  leadSources,
  leadStatuses,
  type LeadPriority,
  type LeadRecord,
  type LeadSource,
  type LeadStatus,
} from "@aop/types";

export { leadPriorities, leadSources, leadStatuses };
export type { LeadPriority, LeadSource, LeadStatus };

export const leadSortOptions = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "RECENTLY_UPDATED", label: "Recently updated" },
  { value: "PRIORITY", label: "Priority" },
] as const;

export type LeadSortOption = (typeof leadSortOptions)[number]["value"];

export type Lead = LeadRecord &
  Readonly<{
    notes?: readonly string[];
    tags?: readonly string[];
    aiSummary?: string;
    qualification?: Readonly<{
      score?: number;
      intent?: string;
      confidence?: number;
    }>;
    recommendedNextAction?: string;
    riskSignals?: readonly string[];
  }>;

export const leadActivityTypes = [
  "LEAD_CREATED",
  "STATUS_CHANGED",
  "OWNER_ASSIGNED",
  "MESSAGE_RECEIVED",
  "AI_ANALYSIS_COMPLETED",
  "HUMAN_REVIEW",
  "FOLLOW_UP_SCHEDULED",
  "FOLLOW_UP_COMPLETED",
] as const;

export type LeadActivityType = (typeof leadActivityTypes)[number];

export type LeadActivity = Readonly<{
  id: string;
  type: LeadActivityType;
  occurredAt: string;
  actor: string | null;
  summary: string;
}>;

export type LeadNote = Readonly<{
  id: string;
  body: string;
  createdAt: string;
  author: string;
}>;

export type LeadTag = Readonly<{
  id: string;
  label: string;
}>;

export type LeadAIContext = Readonly<{
  summary: string | null;
  intent: string | null;
  qualificationScore: number | null;
  recommendedNextAction: string | null;
  riskSignals: readonly string[];
}>;

export type LeadNextAction = Readonly<{
  id: string;
  label: string;
  scheduledFor: string;
}>;

export type LeadDetail = Readonly<{
  lead: Lead;
  enquiryContext: string;
  activity: readonly LeadActivity[];
  notes: readonly LeadNote[];
  tags: readonly LeadTag[];
  aiContext: LeadAIContext | null;
  nextAction: LeadNextAction | null;
}>;

export type LeadFilterState = Readonly<{
  statuses: readonly LeadStatus[];
  priorities: readonly LeadPriority[];
  sources: readonly LeadSource[];
  owners: readonly "UNASSIGNED"[];
  sort: LeadSortOption;
}>;

export const initialLeadFilterState: LeadFilterState = {
  statuses: [],
  priorities: [],
  sources: [],
  owners: [],
  sort: "NEWEST",
};

export const emptyLeads: readonly Lead[] = [];

export const leadPipelineStates = [
  { label: "New", status: "NEW", description: "Awaiting first review" },
  {
    label: "Qualified",
    status: "QUALIFIED",
    description: "Ready for a decision",
  },
  {
    label: "In progress",
    status: "IN_PROGRESS",
    description: "Active operational work",
  },
  {
    label: "Converted",
    status: "CONVERTED",
    description: "Completed opportunities",
  },
] as const satisfies readonly {
  label: string;
  status: LeadStatus;
  description: string;
}[];

export const leadWorkflow = [
  { label: "Enquiry", step: "01" },
  { label: "Lead", step: "02" },
  { label: "Qualification", step: "03" },
  { label: "Follow-up", step: "04" },
] as const;

export const LEAD_ACTIONS_UNAVAILABLE_MESSAGE =
  "Lead actions will be available when the workspace is connected.";

export const leadStatusLabels: Readonly<Record<LeadStatus, string>> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  IN_PROGRESS: "In progress",
  CONVERTED: "Converted",
  LOST: "Lost",
};

export const leadPriorityLabels: Readonly<Record<LeadPriority, string>> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export const leadSourceLabels: Readonly<Record<LeadSource, string>> = {
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  EMAIL: "Email",
  INSTAGRAM: "Instagram",
  PHONE: "Phone",
  MANUAL: "Manual entry",
  OTHER: "Other",
};

export function toggleLeadFilterValue<T extends string>(
  values: readonly T[],
  value: T,
): readonly T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export function getActiveLeadFilterCount(filters: LeadFilterState) {
  return (
    filters.statuses.length +
    filters.priorities.length +
    filters.sources.length +
    filters.owners.length
  );
}

export function getLeadEmptyState(
  query: string,
  filters: LeadFilterState,
): Readonly<{ title: string; description: string }> {
  if (query.trim().length > 0) {
    return {
      title: "No leads match your search.",
      description:
        "Try a different name, company or enquiry term when lead data is connected.",
    };
  }

  if (getActiveLeadFilterCount(filters) > 0) {
    return {
      title: "No leads match these filters.",
      description:
        "Clear one or more filters to return to the complete lead workspace.",
    };
  }

  return {
    title: "No leads yet",
    description:
      "Customer enquiries will appear here once your workspace starts receiving operational data.",
  };
}
