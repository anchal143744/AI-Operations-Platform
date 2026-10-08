"use client";

import type {
  CreateLeadRequest,
  LeadRecord,
  LeadStatusTotals,
} from "@aop/types";
import { useCallback, useEffect, useState } from "react";
import { initialLeadFilterState } from "../../lib/leads/model";
import { leadsService } from "../../lib/leads/leads-service";
import { Icon } from "../icons";
import { Button } from "../ui/primitives";
import { LeadCreateForm } from "./lead-create-form";
import { LeadList } from "./lead-list";
import { LeadPipelineSummary } from "./lead-pipeline-summary";
import { LeadToolbar } from "./lead-toolbar";
import {
  LeadWorkspaceAccess,
  useLeadWorkspaceAccess,
} from "./lead-workspace-access";

export function LeadsPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(initialLeadFilterState);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [controlNotice, setControlNotice] = useState("");
  const [leads, setLeads] = useState<readonly LeadRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const access = useLeadWorkspaceAccess();
  const workspace = access.selected;
  const pipelineKey = workspace
    ? `${workspace.organizationId}:${workspace.workspaceId}`
    : null;
  const [pipeline, setPipeline] = useState<{
    key: string;
    revision: number;
    totals: LeadStatusTotals | null;
  } | null>(null);
  const pipelineTotals =
    pipeline?.key === pipelineKey && pipeline.revision === revision
      ? pipeline.totals
      : undefined;
  const openFilters = useCallback(() => setFiltersOpen(true), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);
  const showCreationUnavailable = () => {
    if (!workspace) {
      setNotice(
        "Sign in and select an active workspace before creating a lead.",
      );
      return;
    }
    setCreateOpen(true);
  };

  useEffect(() => {
    if (!workspace) {
      setLeads([]);
      setTotal(0);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      leadsService
        .list(workspace, {
          page,
          limit: 20,
          ...(query.trim() ? { search: query.trim() } : {}),
          status: filters.statuses,
          priority: filters.priorities,
          source: filters.sources,
          sort: filters.sort,
        })
        .then(
          (result) => {
            if (!active) return;
            setLeads(result.items);
            setTotal(result.total);
            setLoading(false);
          },
          (error: unknown) => {
            if (!active) return;
            setLeads([]);
            setTotal(0);
            setLoadError(
              error instanceof Error ? error.message : "Could not load leads.",
            );
            setLoading(false);
          },
        );
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [workspace, page, query, filters, revision]);

  useEffect(() => {
    if (!workspace) return;
    let active = true;
    const key = `${workspace.organizationId}:${workspace.workspaceId}`;
    void leadsService.summary(workspace).then(
      (totals) => {
        if (active) setPipeline({ key, revision, totals });
      },
      () => {
        if (active) setPipeline({ key, revision, totals: null });
      },
    );
    return () => {
      active = false;
    };
  }, [workspace, revision]);

  async function createLead(input: CreateLeadRequest) {
    if (!workspace) return;
    await leadsService.create(workspace, input);
    setCreateOpen(false);
    setPage(1);
    setRevision((current) => current + 1);
    setNotice("Lead created in the selected workspace.");
  }

  return (
    <div className="leads-page">
      <header className="leads-header">
        <div>
          <p className="app-kicker">Operational records</p>
          <h1>Leads</h1>
          <p>
            Capture, qualify and manage customer opportunities from one
            operational workspace.
          </p>
        </div>
        <Button onClick={showCreationUnavailable}>
          <Icon name="target" size="small" />
          Add lead
        </Button>
      </header>

      <LeadWorkspaceAccess access={access} />

      {createOpen && workspace ? (
        <LeadCreateForm
          onCreate={createLead}
          onCancel={() => setCreateOpen(false)}
        />
      ) : null}

      {notice ? (
        <div className="lead-page-notice" role="status">
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

      <LeadPipelineSummary
        totals={pipelineTotals}
        workspaceReady={Boolean(workspace)}
      />

      <section
        className="lead-workspace"
        aria-labelledby="lead-workspace-title"
      >
        <div className="lead-section-heading">
          <div>
            <p className="app-kicker">Lead workspace</p>
            <h2 id="lead-workspace-title">All leads</h2>
          </div>
          <p>
            {workspace
              ? `${total} lead${total === 1 ? "" : "s"}`
              : "Workspace access required"}
          </p>
        </div>
        {workspace ? (
          <LeadToolbar
            query={query}
            filters={filters}
            filtersOpen={filtersOpen}
            onQueryChange={(value) => {
              setQuery(value);
              setPage(1);
              setControlNotice(
                value
                  ? "Searching the selected workspace."
                  : "Lead search cleared.",
              );
            }}
            onFiltersOpen={openFilters}
            onFiltersClose={closeFilters}
            onFiltersChange={(nextFilters) => {
              setFilters(nextFilters);
              setPage(1);
              setControlNotice(
                "Lead filters updated for the selected workspace.",
              );
            }}
          />
        ) : null}
        <p className="sr-only" role="status" aria-live="polite">
          {controlNotice}
        </p>
        {workspace ? (
          <>
            {loading ? (
              <p className="lead-access-note" role="status">
                Loading leads…
              </p>
            ) : null}
            {loadError ? (
              <p className="lead-access-note" role="alert">
                {loadError}
              </p>
            ) : null}
            {!loading && !loadError ? (
              <LeadList
                leads={leads}
                query={query}
                filters={filters}
                onAddLead={showCreationUnavailable}
              />
            ) : null}
            {total > 20 ? (
              <nav className="lead-pagination" aria-label="Lead pages">
                <Button
                  variant="outline"
                  size="small"
                  disabled={page === 1 || loading}
                  onClick={() => setPage((current) => current - 1)}
                >
                  Previous
                </Button>
                <span>
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <Button
                  variant="outline"
                  size="small"
                  disabled={page * 20 >= total || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </>
        ) : (
          <p className="lead-access-note">
            The lead list will load after an authenticated workspace is
            selected.{" "}
            <a href="/leads/demo-lead-001">Preview the separate demo lead</a>.
          </p>
        )}
      </section>
    </div>
  );
}
