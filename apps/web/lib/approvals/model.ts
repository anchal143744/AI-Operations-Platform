import type { AIOperation } from "../ai-operations/model";
import type { Conversation } from "../conversations/model";
import type { FollowUp } from "../follow-ups/model";
import { leadPriorities, type Lead, type LeadPriority } from "../leads/model";
import type { Workflow } from "../workflows/model";

export const approvalStatuses = [
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
] as const;
export type ApprovalStatus = (typeof approvalStatuses)[number];

// Approval urgency uses the product-wide operational priority vocabulary.
export const approvalPriorities = leadPriorities;
export type ApprovalPriority = LeadPriority;

export const approvalSourceTypes = [
  "AI_OPERATION",
  "WORKFLOW",
  "LEAD",
  "CONVERSATION",
  "FOLLOW_UP",
] as const;
export type ApprovalSourceType = (typeof approvalSourceTypes)[number];

export type ApprovalSource =
  | Readonly<{ type: "AI_OPERATION"; resourceId: AIOperation["id"] }>
  | Readonly<{ type: "WORKFLOW"; resourceId: Workflow["id"] }>
  | Readonly<{ type: "LEAD"; resourceId: Lead["id"] }>
  | Readonly<{ type: "CONVERSATION"; resourceId: Conversation["id"] }>
  | Readonly<{ type: "FOLLOW_UP"; resourceId: FollowUp["id"] }>;

export const requestedActionTypes = [
  "SEND_MESSAGE",
  "UPDATE_LEAD",
  "CREATE_FOLLOW_UP",
  "ASSIGN_OWNER",
  "CHANGE_STATUS",
  "TRIGGER_WORKFLOW",
  "EXECUTE_WORKFLOW",
  "OTHER",
] as const;
export type RequestedActionType = (typeof requestedActionTypes)[number];

export type ApprovalRequest = Readonly<{
  id: string;
  title: string;
  description: string;
  status: ApprovalStatus;
  priority: ApprovalPriority;
  source: ApprovalSource;
  requestedAction: RequestedActionType;
  reason: string;
  requiresHumanReview: boolean;
  requestedBy: string;
  createdAt: string;
  updatedAt: string;
}>;

export type ApprovalProposal = Readonly<{
  approvalRequestId: ApprovalRequest["id"];
  aiRecommendation: string | null;
  policyResult: string | null;
  proposedMessage: string | null;
  proposedChanges: Readonly<Record<string, unknown>> | null;
}>;

export const approvalDecisionTypes = [
  "APPROVE",
  "REJECT",
  "EDIT_AND_APPROVE",
] as const;
export type ApprovalDecisionType = (typeof approvalDecisionTypes)[number];

export type ApprovalDecision = Readonly<{
  approvalRequestId: ApprovalRequest["id"];
  decision: ApprovalDecisionType;
  reviewerId: string;
  reviewedAt: string;
  reviewNote: string | null;
  decisionReason: string | null;
}>;

export const approvalExecutionStatuses = [
  "NOT_STARTED",
  "QUEUED",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
] as const;
export type ApprovalExecutionStatus =
  (typeof approvalExecutionStatuses)[number];

export type ApprovalExecutionResult = Readonly<{
  approvalRequestId: ApprovalRequest["id"];
  status: ApprovalExecutionStatus;
  executedAt: string | null;
  result: Readonly<Record<string, unknown>> | null;
}>;

export const approvalViews = [
  { value: "ALL", label: "All" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
  { value: "HIGH_PRIORITY", label: "High priority" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
] as const;
export type ApprovalView = (typeof approvalViews)[number]["value"];

export const approvalSortOptions = [
  { value: "NEWEST", label: "Newest" },
  { value: "OLDEST", label: "Oldest" },
  { value: "PRIORITY", label: "Priority" },
  { value: "NEEDS_REVIEW_FIRST", label: "Needs review first" },
] as const;
export type ApprovalSortOption = (typeof approvalSortOptions)[number]["value"];

export type ApprovalFilterState = Readonly<{
  statuses: readonly ApprovalStatus[];
  priorities: readonly ApprovalPriority[];
  sources: readonly ApprovalSourceType[];
  actions: readonly RequestedActionType[];
  reviewers: readonly "UNASSIGNED"[];
  sort: ApprovalSortOption;
}>;

export type ApprovalSearchState = string;

export const approvalStatusLabels: Readonly<Record<ApprovalStatus, string>> = {
  NEEDS_REVIEW: "Needs review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const approvalSourceLabels: Readonly<
  Record<ApprovalSourceType, string>
> = {
  AI_OPERATION: "AI operation",
  WORKFLOW: "Workflow",
  LEAD: "Lead",
  CONVERSATION: "Conversation",
  FOLLOW_UP: "Follow-up",
};

export const requestedActionLabels: Readonly<
  Record<RequestedActionType, string>
> = {
  SEND_MESSAGE: "Send message",
  UPDATE_LEAD: "Update lead",
  CREATE_FOLLOW_UP: "Create follow-up",
  ASSIGN_OWNER: "Assign owner",
  CHANGE_STATUS: "Change status",
  TRIGGER_WORKFLOW: "Trigger workflow",
  EXECUTE_WORKFLOW: "Execute workflow",
  OTHER: "Other",
};

export const approvalSummaryItems = [
  { label: "Needs review", description: "Decisions waiting for attention" },
  { label: "High priority", description: "Urgent consequential requests" },
  { label: "Approved", description: "Accepted human decisions" },
  { label: "Rejected", description: "Declined proposed actions" },
] as const;

export const APPROVAL_POLICY_UNAVAILABLE_MESSAGE =
  "Approval policies will be configurable when the policy engine is connected.";
export const APPROVAL_PROCESSING_UNAVAILABLE_MESSAGE =
  "Approval processing will be available when the backend approval service is connected.";

export const rejectionReasonCategories = [
  "Incorrect recommendation",
  "Policy conflict",
  "Insufficient context",
  "Customer risk",
  "Business rule",
  "Other",
] as const;

export const approvalControlStages = [
  {
    label: "AI",
    actions: ["Understand", "Summarize", "Recommend", "Draft"],
  },
  {
    label: "Policy",
    actions: ["Evaluate", "Restrict", "Require approval"],
  },
  {
    label: "Human",
    actions: ["Review", "Approve", "Reject", "Override"],
  },
  { label: "System", actions: ["Execute", "Record", "Audit"] },
] as const;

export const approvalContextLinks = [
  { type: "LEAD", label: "Leads", href: "/leads" },
  { type: "CONVERSATION", label: "Inbox", href: "/inbox" },
  { type: "FOLLOW_UP", label: "Follow-ups", href: "/follow-ups" },
  {
    type: "AI_OPERATION",
    label: "AI Operations",
    href: "/ai-operations",
  },
  { type: "WORKFLOW", label: "Workflows", href: "/workflows" },
] as const satisfies readonly {
  type: ApprovalSourceType;
  label: string;
  href: `/${string}`;
}[];
