import { apiOrigin } from "../auth/authentication-service";
import type { WorkspaceSelection } from "../tenancy/tenancy-service";

export type ControlledWorkflow = Readonly<{
  id: string;
  name: string;
  description: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "ARCHIVED";
  triggerType: "MANUAL";
  actionType: "DRY_RUN_LOG" | "INTERNAL_NOTIFICATION";
  currentVersion: number;
  policy: Readonly<{ id: string; mode: PolicyMode; version: number }>;
  createdAt: string;
}>;
export type ControlledWorkflowVersion = Readonly<{
  id: string;
  version: number;
  name: string;
  description: string;
  triggerType: "MANUAL";
  actionType: ControlledWorkflow["actionType"];
  policyMode: PolicyMode;
  policyVersion: number;
  createdAt: string;
}>;
export type WorkflowSummary = Readonly<{
  workflows: number;
  running: number;
  failed: number;
}>;
export type ApprovalSummary = Readonly<{ pending: number }>;
export type PolicyMode = "ALLOW_DRY_RUN" | "REQUIRE_APPROVAL" | "BLOCK";
export type ControlledExecution = Readonly<{
  id: string;
  workflowId: string;
  status:
    | "QUEUED"
    | "WAITING_FOR_APPROVAL"
    | "RUNNING"
    | "SUCCEEDED"
    | "FAILED"
    | "CANCELLED";
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  evaluation?: Readonly<{ result: string; policyVersion: number }>;
  steps?: readonly Readonly<{
    stepNumber: number;
    status: string;
    actionType: string;
    startedAt: string | null;
    completedAt: string | null;
  }>[];
  outboxEvents?: readonly Readonly<{
    status: string;
    attempts: number;
    maxAttempts: number;
    nextAttemptAt: string;
  }>[];
  definitionVersion?: Readonly<{
    version: number;
    name: string;
    actionType: ControlledWorkflow["actionType"];
    policyMode: PolicyMode;
  }> | null;
  approval?: Readonly<{ id: string; status: string }>;
}>;
export type ControlledApproval = Readonly<{
  id: string;
  workflowId: string;
  workflowExecutionId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  reason: string | null;
  createdAt: string;
  expiresAt: string | null;
  workflow: Readonly<{
    name: string;
    actionType: ControlledWorkflow["actionType"];
  }>;
  decision: Readonly<{
    decision: string;
    decidedAt: string;
    note: string | null;
  }> | null;
  workflowExecution: Readonly<{
    id: string;
    status: ControlledExecution["status"];
    definitionVersion: Readonly<{
      version: number;
      name: string;
      actionType: ControlledWorkflow["actionType"];
      policyMode: PolicyMode;
    }> | null;
    evaluation: Readonly<{
      result: "ALLOWED" | "BLOCKED" | "APPROVAL_REQUIRED";
      policyVersion: number;
    }> | null;
  }> | null;
}>;

async function request<T>(
  workspace: WorkspaceSelection,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "X-AOP-Organization-Id": workspace.organizationId,
      "X-AOP-Workspace-Id": workspace.workspaceId,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Sign in to continue."
        : response.status === 403
          ? "You do not have permission for this workspace action."
          : response.status === 404
            ? "This item is not available in the selected workspace."
            : response.status === 409
              ? "The item changed or this transition is not available. Refresh and try again."
              : response.status === 400
                ? "Check the submitted details and try again."
                : "The workflow control service is unavailable. Try again shortly.",
    );
  }
  return (await response.json()) as T;
}

export const workflowControlService = {
  workflows: (workspace: WorkspaceSelection) =>
    request<ControlledWorkflow[]>(workspace, "/workflows"),
  summary: (workspace: WorkspaceSelection) =>
    request<WorkflowSummary>(workspace, "/workflows/summary"),
  versions: (workspace: WorkspaceSelection, id: string) =>
    request<ControlledWorkflowVersion[]>(
      workspace,
      `/workflows/${encodeURIComponent(id)}/versions`,
    ),
  definition: (
    workspace: WorkspaceSelection,
    id: string,
    changes: Readonly<{
      name?: string;
      description?: string;
      actionType?: ControlledWorkflow["actionType"];
    }>,
  ) =>
    request<ControlledWorkflow>(workspace, `/workflows/${id}/definition`, {
      method: "PATCH",
      body: JSON.stringify(changes),
    }),
  create: (
    workspace: WorkspaceSelection,
    name: string,
    description: string,
    actionType: ControlledWorkflow["actionType"],
  ) =>
    request<ControlledWorkflow>(workspace, "/workflows", {
      method: "POST",
      body: JSON.stringify({ name, description, actionType }),
    }),
  status: (
    workspace: WorkspaceSelection,
    id: string,
    status: ControlledWorkflow["status"],
  ) =>
    request<ControlledWorkflow>(
      workspace,
      `/workflows/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status }),
      },
    ),
  policy: (workspace: WorkspaceSelection, id: string, mode: PolicyMode) =>
    request<ControlledWorkflow["policy"]>(
      workspace,
      `/workflows/${encodeURIComponent(id)}/policy`,
      {
        method: "PATCH",
        body: JSON.stringify({ mode }),
      },
    ),
  dryRun: (workspace: WorkspaceSelection, id: string, idempotencyKey: string) =>
    request<ControlledExecution>(
      workspace,
      `/workflows/${encodeURIComponent(id)}/executions`,
      {
        method: "POST",
        body: JSON.stringify({ idempotencyKey }),
      },
    ),
  executions: (workspace: WorkspaceSelection, id: string) =>
    request<ControlledExecution[]>(
      workspace,
      `/workflows/${encodeURIComponent(id)}/executions`,
    ),
  approvals: (workspace: WorkspaceSelection) =>
    request<ControlledApproval[]>(workspace, "/approvals"),
  approvalSummary: (workspace: WorkspaceSelection) =>
    request<ApprovalSummary>(workspace, "/approvals/summary"),
  decide: (
    workspace: WorkspaceSelection,
    id: string,
    decision: "APPROVED" | "REJECTED",
    note?: string,
  ) =>
    request(workspace, `/approvals/${encodeURIComponent(id)}/decisions`, {
      method: "POST",
      body: JSON.stringify({ decision, ...(note ? { note } : {}) }),
    }),
};
