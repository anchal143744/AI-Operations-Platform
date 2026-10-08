"use client";

import type { ActivityRecord } from "@aop/types";
import { useCallback, useEffect, useState } from "react";
import { activityService } from "../../lib/activity/activity-service";
import {
  ACTIVITY_EXPORT_UNAVAILABLE_MESSAGE,
  type ActivityEvent,
  type ActivityView,
} from "../../lib/activity/model";
import { initialActivityFilterState } from "../../lib/activity/state";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";
import { Icon } from "../icons";
import {
  ActivityEventDetails,
  ActivityContextPanel,
  AuditInformation,
} from "./activity-details";
import { ActivityHeader } from "./activity-header";
import { ActivityList } from "./activity-list";
import { ActivitySummary } from "./activity-summary";
import { ActivityToolbar } from "./activity-toolbar";
import { ActivityViews } from "./activity-views";
import { AuditControlModel } from "./audit-control-model";

function toEvent(event: ActivityRecord): ActivityEvent {
  const type = event.eventType.startsWith("LEAD_")
    ? "LEAD"
    : event.eventType.startsWith("FOLLOW_UP_")
      ? "FOLLOW_UP"
      : event.eventType.startsWith("CONVERSATION_") ||
          event.eventType.startsWith("MESSAGE_") ||
          event.eventType === "WEBHOOK_RECEIVED"
        ? "CONVERSATION"
        : event.eventType.startsWith("APPROVAL_")
          ? "APPROVAL"
          : event.eventType.startsWith("WORKFLOW_") ||
              event.eventType.startsWith("POLICY_") ||
              event.eventType.startsWith("NOTIFICATION_")
            ? "WORKFLOW"
            : event.eventType.startsWith("USER_")
              ? "SECURITY"
              : "SYSTEM";
  return {
    id: event.id,
    type,
    source: { type, resourceId: event.resourceId ?? event.id },
    status: "RECORDED",
    priority: null,
    actor: { type: event.actorType },
    action: event.action,
    summary: event.summary,
    createdAt: event.occurredAt,
    context: {},
  };
}

export function ActivityPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(initialActivityFilterState);
  const [view, setView] = useState<ActivityView>("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [controlNotice, setControlNotice] = useState("");
  const access = useWorkspaceContext();
  const workspace = access.selected;
  const [page, setPage] = useState(1);
  const [refreshTick, setRefreshTick] = useState(0);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    events: readonly ActivityEvent[];
    total: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify({
    organizationId: workspace?.organizationId,
    workspaceId: workspace?.workspaceId,
    page,
    query,
    view,
    actor: filters.actors[0],
    dateRange: filters.dateRange,
    sort: filters.sort,
    workflowId,
  });
  const current = snapshot?.key === key ? snapshot : null;
  const selected =
    current?.events.find((event) => event.id === selectedId) ?? null;
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("workflowId");
    if (id) setWorkflowId(id);
  }, []);

  useEffect(() => {
    if (!workspace) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void activityService
        .list(workspace, {
          page,
          search: query,
          category: view,
          ...(filters.actors[0] ? { actorType: filters.actors[0] } : {}),
          dateRange: filters.dateRange,
          sort: filters.sort === "OLDEST" ? "OLDEST" : "NEWEST",
          ...(workflowId ? { workflowId } : {}),
        })
        .then(
          (result) => {
            if (!active) return;
            setSnapshot({
              key,
              events: result.items.map(toEvent),
              total: result.total,
            });
            setLoading(false);
          },
          (failure: unknown) => {
            if (!active) return;
            setError(
              failure instanceof Error
                ? failure.message
                : "Activity could not be loaded.",
            );
            setLoading(false);
          },
        );
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [
    workspace,
    key,
    page,
    query,
    view,
    filters.actors,
    filters.dateRange,
    filters.sort,
    workflowId,
    refreshTick,
  ]);

  useEffect(() => {
    if (!workspace) return;
    const refresh = () => {
      if (document.visibilityState === "visible")
        setRefreshTick((value) => value + 1);
    };
    const interval = window.setInterval(refresh, 15_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [workspace]);

  return (
    <div className="operations-page activity-page">
      <ActivityHeader
        onExport={() => setNotice(ACTIVITY_EXPORT_UNAVAILABLE_MESSAGE)}
      />
      {notice ? (
        <div className="ops-notice" role="status">
          <Icon name="history" size="small" />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice(null)}
          >
            <Icon name="x" size="small" />
          </button>
        </div>
      ) : null}
      <ActivitySummary />
      <section
        className="ops-workspace"
        id="activity-log"
        aria-labelledby="activity-log-title"
      >
        <div className="ops-section-heading">
          <div>
            <p className="app-kicker">Historical record</p>
            <h2 id="activity-log-title">Operational activity</h2>
          </div>
          <span>{workspace ? "Append-only audit" : "Select a workspace"}</span>
        </div>
        <ActivityViews
          value={view}
          onChange={(nextView) => {
            setView(nextView);
            setPage(1);
            setControlNotice("Activity view updated.");
          }}
        />
        <ActivityToolbar
          query={query}
          filters={filters}
          filtersOpen={filtersOpen}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(1);
            setControlNotice(
              value
                ? "Searching recorded activity."
                : "Activity search cleared.",
            );
          }}
          onFiltersOpen={() => setFiltersOpen(true)}
          onFiltersClose={closeFilters}
          onFiltersChange={(nextFilters) => {
            setFilters(nextFilters);
            setPage(1);
            setControlNotice("Activity filters updated.");
          }}
        />
        {workflowId ? (
          <p className="lead-access-note">
            Showing audit history for one workflow.{" "}
            <button
              type="button"
              onClick={() => {
                setWorkflowId(null);
                window.history.replaceState(null, "", "/activity");
              }}
            >
              Clear workflow filter
            </button>
          </p>
        ) : null}
        {!workspace && access.status !== "loading" ? (
          <p role="status">
            Sign in and select a workspace to view recorded activity.
          </p>
        ) : null}
        {loading && !current ? <p role="status">Loading activity…</p> : null}
        {error ? (
          <p role="alert">
            {error}{" "}
            <button
              type="button"
              onClick={() => setRefreshTick((value) => value + 1)}
            >
              Retry
            </button>
          </p>
        ) : null}
        {workspace && current && !error ? (
          <div className="activity-workspace-grid">
            <ActivityList
              events={current.events}
              query={query}
              filters={filters}
              view={view}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            <ActivityEventDetails event={selected} />
          </div>
        ) : null}
        {current && current.total > 50 && !error ? (
          <nav className="lead-pagination" aria-label="Activity pages">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.ceil(current.total / 50)}
            </span>
            <button
              type="button"
              disabled={page * 50 >= current.total}
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </nav>
        ) : null}
      </section>
      <div className="activity-context-grid">
        <ActivityContextPanel />
        <AuditInformation />
      </div>
      <AuditControlModel />
      <p className="sr-only" role="status" aria-live="polite">
        {controlNotice}
      </p>
    </div>
  );
}
