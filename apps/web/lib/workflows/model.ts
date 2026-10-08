import type { AIOperation } from "../ai-operations/model";
import type { Conversation } from "../conversations/model";
import type { FollowUp } from "../follow-ups/model";
import type { Lead } from "../leads/model";

export const workflowStatuses = [
  "DRAFT",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
  "FAILED",
] as const;
export type WorkflowStatus = (typeof workflowStatuses)[number];

export const workflowTriggerTypes = [
  "NEW_LEAD",
  "NEW_CONVERSATION",
  "LEAD_STATUS_CHANGED",
  "FOLLOW_UP_DUE",
  "FOLLOW_UP_OVERDUE",
  "AI_RECOMMENDATION",
  "FORM_SUBMITTED",
  "MANUAL_TRIGGER",
  "SCHEDULED",
] as const;
export type WorkflowTriggerType = (typeof workflowTriggerTypes)[number];

export const workflowStepTypes = [
  "ANALYZE_WITH_AI",
  "QUALIFY_LEAD",
  "UPDATE_LEAD",
  "CREATE_FOLLOW_UP",
  "SEND_MESSAGE",
  "ASSIGN_OWNER",
  "WAIT",
  "REQUEST_HUMAN_APPROVAL",
  "RUN_CONDITION",
  "CREATE_TASK",
  "LOG_ACTIVITY",
  "END",
] as const;
export type WorkflowStepType = (typeof workflowStepTypes)[number];

export type WorkflowTrigger = Readonly<{
  type: WorkflowTriggerType;
  sourceId?:
    Lead["id"] | Conversation["id"] | FollowUp["id"] | AIOperation["id"];
}>;

export type WorkflowStep = Readonly<{
  id: string;
  type: WorkflowStepType;
  order: number;
  requiresApproval: boolean;
}>;

export type WorkflowDefinition = Readonly<{
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  trigger: WorkflowTrigger;
  steps: readonly WorkflowStep[];
  createdAt: string;
  updatedAt: string;
  owner: string | null;
  requiresApproval: boolean;
}>;

// Kept as the public UI name while execution remains a separate backend concern.
export type Workflow = WorkflowDefinition;

export const workflowExecutionStatuses = [
  "QUEUED",
  "RUNNING",
  "WAITING_FOR_APPROVAL",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type WorkflowExecutionStatus =
  (typeof workflowExecutionStatuses)[number];

export type WorkflowExecutionSummary = Readonly<{
  workflowId: Workflow["id"];
  status: WorkflowExecutionStatus;
  lastRunAt: string | null;
  nextRunAt: string | null;
  runCount: number;
  successRate: number | null;
  lastFailureReason: string | null;
}>;

export const workflowViews = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "DRAFT", label: "Draft" },
  { value: "PAUSED", label: "Paused" },
  { value: "COMPLETED", label: "Completed" },
  { value: "FAILED", label: "Failed" },
] as const;
export type WorkflowView = (typeof workflowViews)[number]["value"];

export const workflowSortOptions = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "RECENTLY_UPDATED", label: "Recently updated" },
  { value: "STATUS", label: "Status" },
] as const;
export type WorkflowSortOption = (typeof workflowSortOptions)[number]["value"];

export type WorkflowFilterState = Readonly<{
  statuses: readonly WorkflowStatus[];
  triggers: readonly WorkflowTriggerType[];
  owners: readonly "UNASSIGNED"[];
  approval: "ALL" | "REQUIRED" | "NOT_REQUIRED";
  sort: WorkflowSortOption;
}>;

export const initialWorkflowFilterState: WorkflowFilterState = {
  statuses: [],
  triggers: [],
  owners: [],
  approval: "ALL",
  sort: "NEWEST",
};

export const emptyWorkflows: readonly Workflow[] = [];

export const workflowSummaryItems = [
  { label: "Active", description: "Controlled workflows in operation" },
  { label: "Drafts", description: "Processes still being designed" },
  { label: "Needs review", description: "Changes awaiting a person" },
  { label: "Completed", description: "Finished workflow lifecycles" },
] as const;

export const WORKFLOW_CREATION_UNAVAILABLE_MESSAGE =
  "Workflow creation will be available when the automation engine is connected.";
export const WORKFLOW_TEMPLATES_UNAVAILABLE_MESSAGE =
  "Workflow templates will be available when the automation engine is connected.";

export const workflowControlStages = [
  "Trigger",
  "Context",
  "AI decision",
  "Policy",
  "Human approval",
  "Action",
  "Audit",
] as const;

export const workflowSafetyPrinciples = [
  "Human approval",
  "Policy boundaries",
  "Permission checks",
  "Idempotent execution",
  "Audit trail",
  "Failure handling",
] as const;

export function toggleWorkflowFilterValue<T extends string>(
  values: readonly T[],
  value: T,
): readonly T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export function getActiveWorkflowFilterCount(filters: WorkflowFilterState) {
  return (
    filters.statuses.length +
    filters.triggers.length +
    filters.owners.length +
    (filters.approval === "ALL" ? 0 : 1)
  );
}

export function getWorkflowEmptyState(
  query: string,
  filters: WorkflowFilterState,
  view: WorkflowView,
) {
  if (query.trim()) {
    return {
      title: "No workflows match your search.",
      description: "Try another name or trigger when automation is connected.",
    };
  }
  if (getActiveWorkflowFilterCount(filters)) {
    return {
      title: "No workflows match these filters.",
      description: "Clear one or more filters to return to all workflows.",
    };
  }
  if (view !== "ALL") {
    const label = workflowViews.find((item) => item.value === view)?.label;
    return {
      title: `No ${label?.toLowerCase()} workflows`,
      description:
        "This view will update when the automation engine is connected.",
    };
  }
  return {
    title: "No workflows yet",
    description:
      "Create controlled workflows to connect business events, AI assistance, approvals, and operational actions.",
  };
}
