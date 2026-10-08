"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";
import {
  workflowControlService,
  type ControlledApproval,
} from "../../lib/workflows/workflow-control-service";
import { Badge, Button } from "../ui/primitives";

export function ApprovalRuntimePanel() {
  const { selected: workspace, status } = useWorkspaceContext();
  const key = workspace
    ? `${workspace.organizationId}:${workspace.workspaceId}`
    : null;
  const [items, setItems] = useState<{
    key: string;
    value: ControlledApproval[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const current = items?.key === key ? items.value : null;
  const canDecide =
    workspace?.role === "OWNER" ||
    workspace?.role === "ADMIN" ||
    workspace?.role === "MANAGER";

  const refresh = useCallback(async () => {
    if (!workspace || !key) return;
    setLoading(true);
    setError(null);
    try {
      const value = await workflowControlService.approvals(workspace);
      setItems({ key, value });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not load review requests.",
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

  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    if (!workspace || busy) return;
    setBusy(true);
    setError(null);
    try {
      await workflowControlService.decide(
        workspace,
        id,
        decision,
        selectedId === id ? reviewNote.trim() || undefined : undefined,
      );
      setReviewNote("");
      setNotice(
        decision === "APPROVED"
          ? "Approved action queued. No external provider will be called."
          : "Action rejected and cancelled.",
      );
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not record the decision.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="ops-workspace controlled-workspace"
      id="approval-queue"
      aria-labelledby="controlled-approvals-title"
    >
      <div className="ops-section-heading">
        <div>
          <p className="app-kicker">Verified review queue</p>
          <h2 id="controlled-approvals-title">Workflow decisions</h2>
        </div>
        <Badge tone="warning">Internal actions only</Badge>
      </div>
      <p>
        Requests here come from real workflow policy evaluations. The server
        checks your current membership and approval permission before recording
        a decision.
      </p>
      {!workspace && status !== "loading" ? (
        <p role="status">
          Sign in and select a workspace to view review requests.
        </p>
      ) : null}
      {workspace ? (
        <Button
          size="small"
          variant="outline"
          onClick={() => void refresh()}
          disabled={loading}
        >
          Refresh queue
        </Button>
      ) : null}
      {error ? (
        <p className="controlled-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      {loading && !current ? (
        <p role="status">Loading review requests…</p>
      ) : null}
      {current?.length === 0 ? (
        <p role="status">No workflow actions need review in this workspace.</p>
      ) : null}
      {current?.map((request) => (
        <article className="controlled-item" key={request.id}>
          <div className="controlled-item-head">
            <div>
              <h3>{request.workflow.name}</h3>
              <p>{request.reason ?? "Workflow policy review"}</p>
            </div>
            <Badge>{request.status}</Badge>
          </div>
          <p>
            Proposed action:{" "}
            {(request.workflowExecution?.definitionVersion?.actionType ??
              request.workflow.actionType) === "INTERNAL_NOTIFICATION"
              ? "Create one in-app notification for the requesting member. No email, customer message, or external provider call."
              : "Record one no-op test step. No business change or external provider call."}
          </p>
          <p>
            Requested {new Date(request.createdAt).toLocaleString()} · Expires{" "}
            {request.expiresAt
              ? new Date(request.expiresAt).toLocaleString()
              : "Not set"}
          </p>
          <details
            open={selectedId === request.id}
            onToggle={(event) => {
              if (event.currentTarget.open) {
                setSelectedId(request.id);
                setReviewNote("");
              } else if (selectedId === request.id) setSelectedId(null);
            }}
          >
            <summary>Review request details</summary>
            <dl>
              <div>
                <dt>Workflow version</dt>
                <dd>
                  {request.workflowExecution?.definitionVersion
                    ? `v${request.workflowExecution.definitionVersion.version}`
                    : "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Policy decision</dt>
                <dd>
                  {request.workflowExecution?.evaluation?.result ??
                    "Unavailable"}
                </dd>
              </div>
              <div>
                <dt>Execution</dt>
                <dd>{request.workflowExecution?.status ?? "Unavailable"}</dd>
              </div>
            </dl>
            <Link
              href={`/workflows#workflow-${encodeURIComponent(request.workflowId)}`}
            >
              View workflow and execution
            </Link>
            {request.status === "PENDING" && canDecide ? (
              <label className="form-field">
                Decision note (optional)
                <textarea
                  className="field-control"
                  value={selectedId === request.id ? reviewNote : ""}
                  onChange={(event) => setReviewNote(event.target.value)}
                  maxLength={1000}
                  placeholder="Add context for this decision"
                />
              </label>
            ) : null}
          </details>
          {request.status === "PENDING" && canDecide ? (
            <div className="controlled-actions">
              <Button
                size="small"
                disabled={
                  busy ||
                  Boolean(
                    request.expiresAt &&
                    new Date(request.expiresAt) <= new Date(),
                  )
                }
                onClick={() => void decide(request.id, "APPROVED")}
              >
                Approve action
              </Button>
              <Button
                size="small"
                variant="outline"
                disabled={
                  busy ||
                  Boolean(
                    request.expiresAt &&
                    new Date(request.expiresAt) <= new Date(),
                  )
                }
                onClick={() => void decide(request.id, "REJECTED")}
              >
                Reject
              </Button>
            </div>
          ) : request.status === "PENDING" ? (
            <p>Approval permission is required to decide this request.</p>
          ) : (
            <p>
              Decision: {request.decision?.decision ?? request.status}
              {request.decision?.decidedAt
                ? ` · ${new Date(request.decision.decidedAt).toLocaleString()}`
                : ""}
            </p>
          )}
          {request.decision?.note ? (
            <p>Review note: {request.decision.note}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}
