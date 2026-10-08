"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";
import {
  workflowControlService,
  type ControlledExecution,
  type ControlledWorkflow,
  type ControlledWorkflowVersion,
  type PolicyMode,
} from "../../lib/workflows/workflow-control-service";
import { Badge, Button } from "../ui/primitives";

export function WorkflowRuntimePanel() {
  const { selected: workspace, status: accessStatus } = useWorkspaceContext();
  const key = workspace
    ? `${workspace.organizationId}:${workspace.workspaceId}`
    : null;
  const [items, setItems] = useState<{
    key: string;
    value: ControlledWorkflow[];
  } | null>(null);
  const [executions, setExecutions] = useState<
    Record<string, ControlledExecution[]>
  >({});
  const [versions, setVersions] = useState<
    Record<string, ControlledWorkflowVersion[]>
  >({});
  const [openVersionsId, setOpenVersionsId] = useState<string | null>(null);
  const watchedExecutionIds = Object.keys(executions).join("|");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [actionType, setActionType] =
    useState<ControlledWorkflow["actionType"]>("DRY_RUN_LOG");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editActionType, setEditActionType] =
    useState<ControlledWorkflow["actionType"]>("DRY_RUN_LOG");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const retryKeys = useRef<Record<string, string>>({});
  const followedHash = useRef<string | null>(null);
  const current = items?.key === key ? items.value : null;
  const canManage =
    workspace?.role === "OWNER" ||
    workspace?.role === "ADMIN" ||
    workspace?.role === "MANAGER";
  const canExecute = workspace?.role === "OWNER" || workspace?.role === "ADMIN";

  const refresh = useCallback(async () => {
    if (!workspace || !key) return;
    setLoading(true);
    setError(null);
    try {
      const value = await workflowControlService.workflows(workspace);
      setItems({ key, value });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not load workflows.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspace, key]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    setExecutions({});
    setVersions({});
    setOpenVersionsId(null);
    setEditingId(null);
    retryKeys.current = {};
    followedHash.current = null;
  }, [key]);

  function beginEdit(workflow: ControlledWorkflow) {
    setEditingId(workflow.id);
    setEditName(workflow.name);
    setEditDescription(workflow.description);
    setEditActionType(workflow.actionType);
  }

  async function saveDefinition(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    if (!workspace || busy) return;
    setBusy(true);
    setError(null);
    try {
      await workflowControlService.definition(workspace, id, {
        name: editName.trim(),
        description: editDescription.trim(),
        actionType: editActionType,
      });
      setEditingId(null);
      setNotice(
        "A new immutable definition version was saved. Previous executions keep their version.",
      );
      await refresh();
      if (openVersionsId === id) await refreshVersions(id);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not save a new definition version.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspace || busy) return;
    setBusy(true);
    setError(null);
    try {
      await workflowControlService.create(
        workspace,
        name.trim(),
        description.trim(),
        actionType,
      );
      setName("");
      setDescription("");
      setActionType("DRY_RUN_LOG");
      setCreating(false);
      setNotice(
        actionType === "INTERNAL_NOTIFICATION"
          ? "Draft saved. This action requires approval before creating an internal notification."
          : "Draft workflow saved. Its only action is a no-side-effect dry run.",
      );
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not save workflow.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(
    id: string,
    status: ControlledWorkflow["status"],
  ) {
    if (!workspace || busy) return;
    setBusy(true);
    setError(null);
    try {
      await workflowControlService.status(workspace, id, status);
      if (status === "ACTIVE") setEditingId(null);
      setNotice(`Workflow moved to ${status.toLowerCase()}.`);
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not change workflow status.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function changePolicy(id: string, mode: PolicyMode) {
    if (!workspace || busy) return;
    setBusy(true);
    setError(null);
    try {
      await workflowControlService.policy(workspace, id, mode);
      setNotice("Workflow policy updated. No external actions are enabled.");
      await refresh();
      if (openVersionsId === id) await refreshVersions(id);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not update policy.",
      );
    } finally {
      setBusy(false);
    }
  }

  const refreshExecutions = useCallback(
    async (id: string) => {
      if (!workspace) return;
      try {
        const value = await workflowControlService.executions(workspace, id);
        setExecutions((current) => ({ ...current, [id]: value }));
      } catch (failure) {
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not load executions.",
        );
      }
    },
    [workspace],
  );

  useEffect(() => {
    if (!current || !workspace) return;
    const hash = window.location.hash;
    if (!hash.startsWith("#workflow-") || followedHash.current === hash) return;
    const workflowId = hash.slice("#workflow-".length);
    if (!current.some((workflow) => workflow.id === workflowId)) return;
    followedHash.current = hash;
    requestAnimationFrame(() => {
      document.getElementById(`workflow-${workflowId}`)?.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });
    void refreshExecutions(workflowId);
  }, [current, workspace, refreshExecutions]);

  async function refreshVersions(id: string) {
    if (!workspace) return;
    try {
      const value = await workflowControlService.versions(workspace, id);
      setVersions((current) => ({ ...current, [id]: value }));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not load version history.",
      );
    }
  }

  function toggleVersions(id: string) {
    if (openVersionsId === id) {
      setOpenVersionsId(null);
      return;
    }
    setOpenVersionsId(id);
    void refreshVersions(id);
  }

  useEffect(() => {
    if (!workspace || !watchedExecutionIds) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      watchedExecutionIds.split("|").forEach((id) => {
        void refreshExecutions(id);
      });
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [workspace, watchedExecutionIds, refreshExecutions]);

  async function execute(workflow: ControlledWorkflow) {
    if (!workspace || busy) return;
    setBusy(true);
    setError(null);
    const idempotencyKey =
      retryKeys.current[workflow.id] ?? crypto.randomUUID();
    retryKeys.current[workflow.id] = idempotencyKey;
    try {
      const execution = await workflowControlService.dryRun(
        workspace,
        workflow.id,
        idempotencyKey,
      );
      delete retryKeys.current[workflow.id];
      setNotice(
        execution.status === "WAITING_FOR_APPROVAL"
          ? "Execution is waiting for human approval. No action has executed."
          : execution.status === "CANCELLED"
            ? "Policy blocked this execution."
            : "Execution queued. Internal actions do not call external services.",
      );
      await refreshExecutions(workflow.id);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not request execution.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="ops-workspace controlled-workspace"
      aria-labelledby="controlled-workflows-title"
    >
      <div className="ops-section-heading">
        <div>
          <p className="app-kicker">Live control foundation</p>
          <h2 id="controlled-workflows-title">Workflow definitions</h2>
        </div>
        <Badge tone="warning">Internal actions only</Badge>
      </div>
      <p>
        Manual triggers can run a no-op dry run or create an internal
        notification after policy and human review. No external delivery is
        enabled.
      </p>
      {!workspace && accessStatus !== "loading" ? (
        <p role="status">Sign in and select a workspace to manage workflows.</p>
      ) : null}
      {workspace ? (
        <div className="controlled-actions">
          {canManage ? (
            <Button
              size="small"
              onClick={() => setCreating((value) => !value)}
              aria-expanded={creating}
              aria-controls="controlled-workflow-form"
            >
              {creating ? "Close form" : "Create draft"}
            </Button>
          ) : null}
          <Button
            size="small"
            variant="outline"
            onClick={() => void refresh()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      ) : null}
      {creating && workspace && canManage ? (
        <form
          id="controlled-workflow-form"
          onSubmit={(event) => void create(event)}
          className="controlled-form"
        >
          <div className="form-field">
            <label htmlFor="workflow-name">Workflow name</label>
            <input
              id="workflow-name"
              className="field-control"
              required
              maxLength={160}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="workflow-description">Description</label>
            <textarea
              id="workflow-description"
              className="field-control"
              maxLength={1000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor="workflow-action-type">Action</label>
            <select
              id="workflow-action-type"
              className="field-control"
              value={actionType}
              onChange={(event) =>
                setActionType(
                  event.target.value as ControlledWorkflow["actionType"],
                )
              }
            >
              <option value="DRY_RUN_LOG">No-op dry run</option>
              <option value="INTERNAL_NOTIFICATION">
                Internal notification to requester
              </option>
            </select>
          </div>
          <Button size="small" type="submit" disabled={busy}>
            Save draft
          </Button>
        </form>
      ) : null}
      {error ? (
        <p className="controlled-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      {loading && !current ? <p role="status">Loading workflows…</p> : null}
      {current?.length === 0 ? (
        <p role="status">No workflow definitions in this workspace yet.</p>
      ) : null}
      {current?.map((workflow) => (
        <article
          key={workflow.id}
          id={`workflow-${workflow.id}`}
          className="controlled-item"
        >
          <div className="controlled-item-head">
            <div>
              <h3>{workflow.name}</h3>
              <p>{workflow.description || "Manual dry-run workflow"}</p>
            </div>
            <Badge>{workflow.status.replaceAll("_", " ")}</Badge>
          </div>
          <p>
            Definition v{workflow.currentVersion} · Trigger: manual · Action:{" "}
            {workflow.actionType.replaceAll("_", " ")} · Policy:{" "}
            {workflow.policy.mode.replaceAll("_", " ")}
          </p>
          <div className="controlled-actions">
            {canManage &&
            (workflow.status === "DRAFT" || workflow.status === "PAUSED") ? (
              <Button
                size="small"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  editingId === workflow.id
                    ? setEditingId(null)
                    : beginEdit(workflow)
                }
                aria-expanded={editingId === workflow.id}
                aria-controls={`workflow-edit-${workflow.id}`}
              >
                {editingId === workflow.id ? "Close editor" : "Edit definition"}
              </Button>
            ) : null}
            {canManage &&
            (workflow.status === "DRAFT" || workflow.status === "PAUSED") ? (
              <Button
                size="small"
                variant="outline"
                disabled={busy}
                onClick={() => void changeStatus(workflow.id, "ACTIVE")}
              >
                Activate
              </Button>
            ) : null}
            {canManage && workflow.status === "ACTIVE" ? (
              <Button
                size="small"
                variant="outline"
                disabled={busy}
                onClick={() => void changeStatus(workflow.id, "PAUSED")}
              >
                Pause
              </Button>
            ) : null}
            {canManage && workflow.status !== "ARCHIVED" ? (
              <label className="controlled-select">
                Policy{" "}
                <select
                  className="field-control"
                  value={workflow.policy.mode}
                  disabled={busy}
                  onChange={(event) =>
                    void changePolicy(
                      workflow.id,
                      event.target.value as PolicyMode,
                    )
                  }
                >
                  <option value="REQUIRE_APPROVAL">
                    Human approval required
                  </option>
                  <option value="BLOCK">Block</option>
                  {workflow.actionType === "DRY_RUN_LOG" ? (
                    <option value="ALLOW_DRY_RUN">
                      Allow dry run without review
                    </option>
                  ) : null}
                </select>
              </label>
            ) : null}
            {canExecute && workflow.status === "ACTIVE" ? (
              <Button
                size="small"
                disabled={busy}
                onClick={() => void execute(workflow)}
              >
                {workflow.actionType === "INTERNAL_NOTIFICATION"
                  ? "Request notification"
                  : "Request dry run"}
              </Button>
            ) : null}
            <Button
              size="small"
              variant="outline"
              onClick={() => void refreshExecutions(workflow.id)}
            >
              Execution status
            </Button>
            <Button
              size="small"
              variant="outline"
              onClick={() => toggleVersions(workflow.id)}
              aria-expanded={openVersionsId === workflow.id}
              aria-controls={`workflow-versions-${workflow.id}`}
            >
              Version history
            </Button>
            <Link
              href={`/activity?workflowId=${encodeURIComponent(workflow.id)}`}
            >
              Audit history
            </Link>
          </div>
          {editingId === workflow.id && canManage ? (
            <form
              id={`workflow-edit-${workflow.id}`}
              className="controlled-form"
              onSubmit={(event) => void saveDefinition(event, workflow.id)}
            >
              <label
                className="form-field"
                htmlFor={`workflow-edit-name-${workflow.id}`}
              >
                Name
                <input
                  id={`workflow-edit-name-${workflow.id}`}
                  className="field-control"
                  required
                  maxLength={160}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                />
              </label>
              <label
                className="form-field"
                htmlFor={`workflow-edit-description-${workflow.id}`}
              >
                Description
                <textarea
                  id={`workflow-edit-description-${workflow.id}`}
                  className="field-control"
                  maxLength={1000}
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                />
              </label>
              <label
                className="form-field"
                htmlFor={`workflow-edit-action-${workflow.id}`}
              >
                Action
                <select
                  id={`workflow-edit-action-${workflow.id}`}
                  className="field-control"
                  value={editActionType}
                  onChange={(event) =>
                    setEditActionType(
                      event.target.value as ControlledWorkflow["actionType"],
                    )
                  }
                >
                  <option value="DRY_RUN_LOG">No-op dry run</option>
                  {workflow.policy.mode !== "ALLOW_DRY_RUN" ? (
                    <option value="INTERNAL_NOTIFICATION">
                      Internal notification to requester
                    </option>
                  ) : null}
                </select>
              </label>
              <Button size="small" type="submit" disabled={busy}>
                Save new version
              </Button>
            </form>
          ) : null}
          {openVersionsId === workflow.id ? (
            <div
              id={`workflow-versions-${workflow.id}`}
              className="controlled-executions"
            >
              <h4>Immutable definition versions</h4>
              {!versions[workflow.id] ? (
                <p role="status">Loading versions…</p>
              ) : (
                <ol>
                  {versions[workflow.id]?.map((version) => (
                    <li key={version.id}>
                      <strong>Version {version.version}</strong> ·{" "}
                      {version.name}
                      {version.version === workflow.currentVersion
                        ? " · Current"
                        : ""}
                      <span>
                        Action: {version.actionType.replaceAll("_", " ")} ·
                        Policy: {version.policyMode.replaceAll("_", " ")} (v
                        {version.policyVersion}) · Saved{" "}
                        {new Date(version.createdAt).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : null}
          {executions[workflow.id] ? (
            <div className="controlled-executions">
              <h4>Recent executions</h4>
              {executions[workflow.id]?.length ? (
                <ul>
                  {executions[workflow.id]?.map((execution) => (
                    <li key={execution.id}>
                      <span>{execution.status.replaceAll("_", " ")}</span>
                      <span>
                        {execution.definitionVersion
                          ? `Definition v${execution.definitionVersion.version}`
                          : "Legacy execution — version not provable"}
                      </span>
                      <span>
                        {new Date(execution.createdAt).toLocaleString()}
                      </span>
                      <span>
                        {execution.approval
                          ? `Review: ${execution.approval.status}`
                          : "No review request"}
                      </span>
                      <span>
                        Policy:{" "}
                        {execution.evaluation?.result ?? "Not evaluated"}
                      </span>
                      <span>
                        Action: {execution.steps?.[0]?.status ?? "Not started"}
                      </span>
                      {execution.startedAt ? (
                        <span>
                          Started{" "}
                          {new Date(execution.startedAt).toLocaleString()}
                        </span>
                      ) : null}
                      {execution.completedAt ? (
                        <span>
                          Finished{" "}
                          {new Date(execution.completedAt).toLocaleString()}
                        </span>
                      ) : null}
                      {execution.outboxEvents?.[0] ? (
                        <span>
                          Worker: {execution.outboxEvents[0].status} · Attempt{" "}
                          {execution.outboxEvents[0].attempts} of{" "}
                          {execution.outboxEvents[0].maxAttempts}
                        </span>
                      ) : null}
                      {execution.approval?.status === "PENDING" ? (
                        <Link href="/approvals#approval-queue">
                          Review request
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No executions yet.</p>
              )}
            </div>
          ) : null}
        </article>
      ))}
    </section>
  );
}
