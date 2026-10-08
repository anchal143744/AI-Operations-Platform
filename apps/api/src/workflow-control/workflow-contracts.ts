import type {
  ActivityEvent,
  ApprovalDecision as PersistedApprovalDecision,
  ApprovalRequest as PersistedApprovalRequest,
  ExecutionStep as PersistedExecutionStep,
  Policy as PersistedPolicy,
  PolicyEvaluation as PersistedPolicyEvaluation,
  Workflow,
  WorkflowExecution as PersistedWorkflowExecution,
  WorkflowTriggerType,
} from "@prisma/client";

/** Existing `Workflow` is the persisted definition; execution is separate. */
export type WorkflowDefinition = Workflow;
export type WorkflowTrigger = Readonly<{ type: WorkflowTriggerType }>;
export type Policy = PersistedPolicy;
export type PolicyEvaluation = PersistedPolicyEvaluation;
export type ApprovalRequest = PersistedApprovalRequest;
export type ApprovalDecision = PersistedApprovalDecision;
export type WorkflowExecution = PersistedWorkflowExecution;
export type ExecutionStep = PersistedExecutionStep;

/** Append-only ActivityEvent is the sole audit/event store, not a second log. */
export type ExecutionEvent = ActivityEvent &
  Readonly<{
    resourceType: "WORKFLOW_EXECUTION";
  }>;
