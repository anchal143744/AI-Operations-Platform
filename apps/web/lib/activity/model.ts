import type { AIOperation } from "../ai-operations/model";
import type { ApprovalRequest } from "../approvals/model";
import type { Conversation } from "../conversations/model";
import type { FollowUp } from "../follow-ups/model";
import { leadPriorities, type Lead, type LeadPriority } from "../leads/model";
import type { Workflow } from "../workflows/model";

export const activityEventTypes = [
  "AI_OPERATION",
  "APPROVAL",
  "WORKFLOW",
  "LEAD",
  "CONVERSATION",
  "FOLLOW_UP",
  "SYSTEM",
  "SECURITY",
] as const;
export type ActivityEventType = (typeof activityEventTypes)[number];

export const activityEventStatuses = [
  "RECORDED",
  "PENDING",
  "SUCCEEDED",
  "FAILED",
  "BLOCKED",
] as const;
export type ActivityEventStatus = (typeof activityEventStatuses)[number];

export const activityActorTypes = [
  "USER",
  "AI",
  "WORKFLOW",
  "SYSTEM",
  "PROVIDER",
] as const;
export type ActivityActorType = (typeof activityActorTypes)[number];

export type ActivityActor = Readonly<{
  type: ActivityActorType;
  id?: string;
  displayName?: string;
}>;

export type ActivityEventSource =
  | Readonly<{ type: "AI_OPERATION"; resourceId: AIOperation["id"] }>
  | Readonly<{ type: "APPROVAL"; resourceId: ApprovalRequest["id"] }>
  | Readonly<{ type: "WORKFLOW"; resourceId: Workflow["id"] }>
  | Readonly<{ type: "LEAD"; resourceId: Lead["id"] }>
  | Readonly<{ type: "CONVERSATION"; resourceId: Conversation["id"] }>
  | Readonly<{ type: "FOLLOW_UP"; resourceId: FollowUp["id"] }>
  | Readonly<{ type: "SYSTEM"; resourceId: string }>
  | Readonly<{ type: "SECURITY"; resourceId: string }>;

export type ActivityContext = Readonly<{
  leadId?: Lead["id"];
  conversationId?: Conversation["id"];
  followUpId?: FollowUp["id"];
  aiOperationId?: AIOperation["id"];
  workflowId?: Workflow["id"];
  approvalRequestId?: ApprovalRequest["id"];
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type ActivityEvent = Readonly<{
  id: string;
  type: ActivityEventType;
  source: ActivityEventSource;
  status: ActivityEventStatus;
  priority: LeadPriority | null;
  actor: ActivityActor;
  action: string;
  summary: string;
  createdAt: string;
  context: ActivityContext;
}>;

export const activityViews = [
  { value: "ALL", label: "All Activity" },
  { value: "AI_OPERATIONS", label: "AI Operations" },
  { value: "APPROVALS", label: "Approvals" },
  { value: "WORKFLOWS", label: "Workflows" },
  { value: "CUSTOMER_OPERATIONS", label: "Customer Operations" },
  { value: "SYSTEM", label: "System" },
  { value: "SECURITY", label: "Security" },
] as const;
export type ActivityView = (typeof activityViews)[number]["value"];

export const activitySortOptions = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "PRIORITY", label: "Priority" },
  { value: "SOURCE", label: "Source" },
] as const;
export type ActivitySortOption = (typeof activitySortOptions)[number]["value"];

export const activityDateRanges = [
  { value: "ANY", label: "Any date" },
  { value: "TODAY", label: "Today (UTC)" },
  { value: "LAST_7_DAYS", label: "Last 7 days" },
  { value: "LAST_30_DAYS", label: "Last 30 days" },
] as const;
export type ActivityDateRange = (typeof activityDateRanges)[number]["value"];

export type ActivityFilterState = Readonly<{
  eventTypes: readonly ActivityEventType[];
  sources: readonly ActivityEventType[];
  statuses: readonly ActivityEventStatus[];
  actors: readonly ActivityActorType[];
  priorities: readonly LeadPriority[];
  dateRange: ActivityDateRange;
  sort: ActivitySortOption;
}>;

export const activitySummaryItems = [
  { label: "AI activity", description: "AI proposals and processing" },
  { label: "Human decisions", description: "Review and approval history" },
  { label: "Workflow events", description: "Automation lifecycle records" },
  { label: "System & security", description: "Platform control events" },
] as const;

export const activityEventTypeLabels: Readonly<
  Record<ActivityEventType, string>
> = {
  AI_OPERATION: "AI operation",
  APPROVAL: "Approval",
  WORKFLOW: "Workflow",
  LEAD: "Lead",
  CONVERSATION: "Conversation",
  FOLLOW_UP: "Follow-up",
  SYSTEM: "System",
  SECURITY: "Security",
};

export const activityEventStatusLabels: Readonly<
  Record<ActivityEventStatus, string>
> = {
  RECORDED: "Recorded",
  PENDING: "Pending",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  BLOCKED: "Blocked",
};

export const activityActorLabels: Readonly<Record<ActivityActorType, string>> =
  {
    USER: "User",
    AI: "AI",
    WORKFLOW: "Workflow",
    SYSTEM: "System",
    PROVIDER: "Provider",
  };

export const activityPriorities = leadPriorities;

export const auditControlStages = [
  {
    label: "Proposal",
    description: "AI or a workflow can propose an operation.",
  },
  {
    label: "Decision",
    description: "Policy and human review determine whether it may proceed.",
  },
  {
    label: "Execution",
    description: "The system records the result of an approved action.",
  },
  {
    label: "Audit",
    description: "Historical context connects the actor, resource and outcome.",
  },
] as const;

export const ACTIVITY_EXPORT_UNAVAILABLE_MESSAGE =
  "Activity export will be available when an audited export service is connected.";

export const emptyActivityEvents: readonly ActivityEvent[] = [];
