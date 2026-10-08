import {
  ApprovalStatus,
  PolicyEvaluationResult,
  PolicyMode,
  WorkflowActionType,
  WorkflowExecutionStatus,
  WorkflowStatus,
} from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  canDecideApproval,
  canTransitionExecution,
  canTransitionWorkflow,
  evaluatePolicy,
  evaluateWorkflowRule,
} from "../apps/api/src/workflow-control/workflow-state";

describe("workflow control state machines", () => {
  it("only permits the declared workflow transitions", () => {
    expect(
      canTransitionWorkflow(WorkflowStatus.DRAFT, WorkflowStatus.ACTIVE),
    ).toBe(true);
    expect(
      canTransitionWorkflow(WorkflowStatus.ACTIVE, WorkflowStatus.PAUSED),
    ).toBe(true);
    expect(
      canTransitionWorkflow(WorkflowStatus.PAUSED, WorkflowStatus.ARCHIVED),
    ).toBe(true);
    expect(
      canTransitionWorkflow(WorkflowStatus.ARCHIVED, WorkflowStatus.ACTIVE),
    ).toBe(false);
    expect(
      canTransitionWorkflow(WorkflowStatus.DRAFT, WorkflowStatus.PAUSED),
    ).toBe(false);
  });

  it("allows only a pending human decision", () => {
    expect(
      canDecideApproval(ApprovalStatus.PENDING, ApprovalStatus.APPROVED),
    ).toBe(true);
    expect(
      canDecideApproval(ApprovalStatus.PENDING, ApprovalStatus.REJECTED),
    ).toBe(true);
    expect(
      canDecideApproval(ApprovalStatus.APPROVED, ApprovalStatus.REJECTED),
    ).toBe(false);
    expect(
      canDecideApproval(ApprovalStatus.PENDING, ApprovalStatus.EXPIRED),
    ).toBe(false);
  });

  it("keeps execution transitions terminal and explicit", () => {
    expect(
      canTransitionExecution(
        WorkflowExecutionStatus.QUEUED,
        WorkflowExecutionStatus.RUNNING,
      ),
    ).toBe(true);
    expect(
      canTransitionExecution(
        WorkflowExecutionStatus.RUNNING,
        WorkflowExecutionStatus.SUCCEEDED,
      ),
    ).toBe(true);
    expect(
      canTransitionExecution(
        WorkflowExecutionStatus.WAITING_FOR_APPROVAL,
        WorkflowExecutionStatus.QUEUED,
      ),
    ).toBe(true);
    expect(
      canTransitionExecution(
        WorkflowExecutionStatus.SUCCEEDED,
        WorkflowExecutionStatus.RUNNING,
      ),
    ).toBe(false);
  });

  it("evaluates the fail-closed policy modes", () => {
    expect(evaluatePolicy(PolicyMode.ALLOW_DRY_RUN)).toBe(
      PolicyEvaluationResult.ALLOWED,
    );
    expect(evaluatePolicy(PolicyMode.REQUIRE_APPROVAL)).toBe(
      PolicyEvaluationResult.APPROVAL_REQUIRED,
    );
    expect(evaluatePolicy(PolicyMode.BLOCK)).toBe(
      PolicyEvaluationResult.BLOCKED,
    );
  });

  it("allows only a no-side-effect action without human review", () => {
    expect(
      evaluateWorkflowRule({
        actionType: WorkflowActionType.DRY_RUN_LOG,
        mode: PolicyMode.ALLOW_DRY_RUN,
      }),
    ).toBe(PolicyEvaluationResult.ALLOWED);
    expect(
      evaluateWorkflowRule({
        actionType: WorkflowActionType.INTERNAL_NOTIFICATION,
        mode: PolicyMode.ALLOW_DRY_RUN,
      }),
    ).toBe(PolicyEvaluationResult.BLOCKED);
    expect(
      evaluateWorkflowRule({
        actionType: WorkflowActionType.INTERNAL_NOTIFICATION,
        mode: PolicyMode.REQUIRE_APPROVAL,
      }),
    ).toBe(PolicyEvaluationResult.APPROVAL_REQUIRED);
    expect(
      evaluateWorkflowRule({
        actionType: WorkflowActionType.INTERNAL_NOTIFICATION,
        mode: PolicyMode.BLOCK,
      }),
    ).toBe(PolicyEvaluationResult.BLOCKED);
  });
});
