import {
  ApprovalStatus,
  PolicyMode,
  PolicyEvaluationResult,
  WorkflowActionType,
  WorkflowExecutionStatus,
  WorkflowStatus,
} from "@prisma/client";

const workflowTransitions: Record<WorkflowStatus, readonly WorkflowStatus[]> = {
  DRAFT: [WorkflowStatus.ACTIVE, WorkflowStatus.ARCHIVED],
  ACTIVE: [WorkflowStatus.PAUSED, WorkflowStatus.ARCHIVED],
  PAUSED: [WorkflowStatus.ACTIVE, WorkflowStatus.ARCHIVED],
  ARCHIVED: [],
};

const executionTransitions: Record<
  WorkflowExecutionStatus,
  readonly WorkflowExecutionStatus[]
> = {
  QUEUED: [
    WorkflowExecutionStatus.RUNNING,
    WorkflowExecutionStatus.FAILED,
    WorkflowExecutionStatus.CANCELLED,
  ],
  WAITING_FOR_APPROVAL: [
    WorkflowExecutionStatus.QUEUED,
    WorkflowExecutionStatus.CANCELLED,
  ],
  RUNNING: [WorkflowExecutionStatus.SUCCEEDED, WorkflowExecutionStatus.FAILED],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
};

export function canTransitionWorkflow(
  from: WorkflowStatus,
  to: WorkflowStatus,
) {
  return workflowTransitions[from].includes(to);
}

export function canTransitionExecution(
  from: WorkflowExecutionStatus,
  to: WorkflowExecutionStatus,
) {
  return executionTransitions[from].includes(to);
}

export function canDecideApproval(from: ApprovalStatus, to: ApprovalStatus) {
  return (
    from === ApprovalStatus.PENDING &&
    (to === ApprovalStatus.APPROVED || to === ApprovalStatus.REJECTED)
  );
}

export function evaluatePolicy(mode: PolicyMode): PolicyEvaluationResult {
  switch (mode) {
    case PolicyMode.ALLOW_DRY_RUN:
      return PolicyEvaluationResult.ALLOWED;
    case PolicyMode.REQUIRE_APPROVAL:
      return PolicyEvaluationResult.APPROVAL_REQUIRED;
    case PolicyMode.BLOCK:
      return PolicyEvaluationResult.BLOCKED;
  }
}

/** One persisted definition version is one explicit action condition and effect.
 * Automatic allow is intentionally limited to the no-side-effect dry run.
 */
export function evaluateWorkflowRule(rule: {
  actionType: WorkflowActionType;
  mode: PolicyMode;
}): PolicyEvaluationResult {
  if (
    rule.mode === PolicyMode.ALLOW_DRY_RUN &&
    rule.actionType !== WorkflowActionType.DRY_RUN_LOG
  ) {
    return PolicyEvaluationResult.BLOCKED;
  }
  return evaluatePolicy(rule.mode);
}
