"use client";

import type {
  CreateFollowUpRequest,
  FollowUpRecord,
  FollowUpSummary as FollowUpSummaryData,
} from "@aop/types";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  initialFollowUpFilterState,
  type FollowUpView,
} from "../../lib/follow-ups/model";
import { followUpsService } from "../../lib/follow-ups/follow-ups-service";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";
import { Icon } from "../icons";
import { Button } from "../ui/primitives";
import { FollowUpCreateForm } from "./follow-up-create-form";
import { FollowUpSummary } from "./follow-up-summary";
import { FollowUpWorkspace } from "./follow-up-workspace";
import { FollowUpsHeader } from "./follow-ups-header";

export function FollowUpsPage() {
  const access = useWorkspaceContext();
  const workspace = access.selected;
  const workspaceKey = workspace
    ? `${workspace.organizationId}:${workspace.workspaceId}`
    : null;
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(initialFollowUpFilterState);
  const [view, setView] = useState<FollowUpView>("ALL");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [controlNotice, setControlNotice] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [queue, setQueue] = useState<{
    key: string;
    revision: number;
    items: readonly FollowUpRecord[];
    total: number;
  } | null>(null);
  const [summary, setSummary] = useState<{
    key: string;
    revision: number;
    totals: FollowUpSummaryData | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const currentQueue =
    queue?.key === workspaceKey && queue.revision === revision ? queue : null;
  const currentSummary =
    summary?.key === workspaceKey && summary.revision === revision
      ? summary.totals
      : undefined;
  const queuePending = Boolean(
    workspace && (loading || (!currentQueue && !loadError)),
  );
  const openFilters = useCallback(() => setFiltersOpen(true), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  useEffect(() => {
    if (!workspace || !workspaceKey) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      void followUpsService
        .list(workspace, { page, limit: 20, search: query, view, filters })
        .then(
          (result) => {
            if (!active) return;
            setQueue({
              key: workspaceKey,
              revision,
              items: result.items,
              total: result.total,
            });
            setLoading(false);
          },
          (failure: unknown) => {
            if (!active) return;
            setLoadError(
              failure instanceof Error
                ? failure.message
                : "Could not load follow-ups.",
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
    workspaceKey,
    page,
    query,
    filters,
    view,
    revision,
    refreshTick,
  ]);

  useEffect(() => {
    if (!workspace || !workspaceKey) return;
    let active = true;
    void followUpsService.summary(workspace).then(
      (totals) => {
        if (active) setSummary({ key: workspaceKey, revision, totals });
      },
      () => {
        if (active) setSummary({ key: workspaceKey, revision, totals: null });
      },
    );
    return () => {
      active = false;
    };
  }, [workspace, workspaceKey, revision, refreshTick]);

  useEffect(() => {
    if (!workspace) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        setRefreshTick((current) => current + 1);
      }
    };
    const interval = window.setInterval(refreshWhenVisible, 15_000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [workspace]);

  function openCreate() {
    if (!workspace) {
      setNotice(
        "Sign in and select an active workspace before creating a follow-up.",
      );
      return;
    }
    setCreateOpen(true);
  }

  async function create(input: CreateFollowUpRequest) {
    if (!workspace) return;
    await followUpsService.create(workspace, input);
    setCreateOpen(false);
    setRevision((current) => current + 1);
    setPage(1);
    setNotice("Follow-up scheduled in the selected workspace.");
  }

  async function complete(id: string) {
    if (!workspace) return;
    await followUpsService.complete(workspace, id);
    setRevision((current) => current + 1);
    setNotice("Follow-up marked complete.");
  }

  async function reschedule(id: string, dueAt: string) {
    if (!workspace) return;
    await followUpsService.reschedule(workspace, id, dueAt);
    setRevision((current) => current + 1);
    setNotice("Follow-up rescheduled.");
  }

  return (
    <div className="follow-ups-page">
      <FollowUpsHeader onCreate={openCreate} />
      {access.status === "loading" ? (
        <p className="lead-access-note" role="status">
          Checking workspace access…
        </p>
      ) : null}
      {access.status === "signed-out" ? (
        <p className="lead-access-note">
          Sign in to use real follow-ups. <Link href="/login">Sign in</Link>
        </p>
      ) : null}
      {access.status === "no-workspace" ? (
        <p className="lead-access-note">
          No active workspace is available.{" "}
          <Link href="/onboarding">Set up your workspace</Link>.
        </p>
      ) : null}
      {access.status === "error" ? (
        <p className="lead-access-note" role="alert">
          Could not check workspace access.{" "}
          <button type="button" onClick={access.retry}>
            Try again
          </button>
        </p>
      ) : null}
      {workspace ? (
        <p className="lead-access-note">
          Real workspace: {workspace.organizationName} /{" "}
          {workspace.workspaceName}. The server verifies access for every
          request.
        </p>
      ) : null}
      {createOpen && workspace ? (
        <FollowUpCreateForm
          key={workspaceKey}
          workspace={workspace}
          onCreate={create}
          onCancel={() => setCreateOpen(false)}
        />
      ) : null}
      {notice ? (
        <div className="follow-up-page-notice" role="status">
          <Icon name="shield-check" size="small" />
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
      <FollowUpSummary
        totals={currentSummary}
        workspaceReady={Boolean(workspace)}
      />
      {queuePending ? (
        <p className="lead-access-note" role="status">
          Loading follow-ups…
        </p>
      ) : null}
      {workspace && loadError ? (
        <div className="lead-access-note" role="alert">
          {loadError}{" "}
          <button
            type="button"
            onClick={() => setRevision((current) => current + 1)}
          >
            Try again
          </button>
        </div>
      ) : null}
      {workspace && !queuePending && !loadError ? (
        <>
          <FollowUpWorkspace
            followUps={currentQueue?.items ?? []}
            total={currentQueue?.total ?? 0}
            query={query}
            filters={filters}
            view={view}
            filtersOpen={filtersOpen}
            onQueryChange={(value) => {
              setQuery(value);
              setPage(1);
              setControlNotice(
                "Searching follow-ups in the selected workspace.",
              );
            }}
            onViewChange={(value) => {
              setView(value);
              setPage(1);
              setControlNotice("Follow-up view updated.");
            }}
            onFiltersOpen={openFilters}
            onFiltersClose={closeFilters}
            onFiltersChange={(value) => {
              setFilters(value);
              setPage(1);
              setControlNotice("Follow-up filters updated.");
            }}
            onCreate={openCreate}
            onComplete={complete}
            onReschedule={reschedule}
          />
          {(currentQueue?.total ?? 0) > 20 ? (
            <nav className="lead-pagination" aria-label="Follow-up pages">
              <Button
                variant="outline"
                size="small"
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <span>
                Page {page} of {Math.ceil((currentQueue?.total ?? 0) / 20)}
              </span>
              <Button
                variant="outline"
                size="small"
                disabled={page * 20 >= (currentQueue?.total ?? 0)}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </nav>
          ) : null}
        </>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {controlNotice}
      </p>
    </div>
  );
}
