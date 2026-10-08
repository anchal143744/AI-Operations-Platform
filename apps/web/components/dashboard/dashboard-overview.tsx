"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  dashboardEmptyModules,
  dashboardWorkflow,
} from "../../lib/app-shell/model";
import {
  dashboardWorkspaceKey,
  loadDashboardSummary,
  type DashboardSummary,
} from "../../lib/dashboard/dashboard-service";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";
import { Icon } from "../icons";
import { Button, ButtonLink, Card } from "../ui/primitives";

export function DashboardOverview() {
  const access = useWorkspaceContext();
  const workspace = access.status === "ready" ? access.selected : null;
  const workspaceKey = workspace ? dashboardWorkspaceKey(workspace) : null;
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data: DashboardSummary;
  } | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const summary = snapshot?.key === workspaceKey ? snapshot.data : null;
  const unavailable =
    summary && Object.values(summary).some((value) => value === null);

  useEffect(() => {
    if (!workspace) return;
    let active = true;
    const key = dashboardWorkspaceKey(workspace);
    const refresh = () => {
      void loadDashboardSummary(workspace).then((data) => {
        if (active) setSnapshot({ key, data });
      });
    };
    refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, 15_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [workspace, refreshToken]);

  const explorePlatform = () => {
    document.getElementById("platform-preview")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return (
    <div className="dashboard-overview">
      <section className="dashboard-intro" aria-labelledby="dashboard-title">
        <div>
          <span className="app-kicker">Initial workspace</span>
          <h1 id="dashboard-title">Your operations start here.</h1>
          <p>
            {workspace
              ? "Your workspace is connected. Leads, conversations and follow-ups recorded in it appear below; AI services are not connected yet."
              : "Sign in and select a workspace to see your operational records."}
          </p>
        </div>
        <span className="dashboard-preview-label">
          <Icon name={workspace ? "shield-check" : "lock"} size="small" />
          {workspace ? "Workspace connected" : "Workspace preview"}
        </span>
      </section>

      <Card className="dashboard-empty-state">
        <div className="dashboard-empty-copy">
          <span className="app-kicker">Controlled execution</span>
          <h2>One operating path. Clear human control.</h2>
          <p>
            Connect incoming work to a structured flow where AI prepares and
            recommends, policy sets boundaries, and your team approves
            consequential actions.
          </p>
          <div className="dashboard-empty-actions">
            {access.status === "loading" ? (
              <Button disabled>Checking workspace…</Button>
            ) : access.status === "error" ? (
              <Button onClick={() => window.location.reload()}>
                Retry workspace
              </Button>
            ) : (
              <ButtonLink
                href={
                  workspace
                    ? "/leads"
                    : access.status === "no-workspace"
                      ? "/onboarding"
                      : "/login"
                }
              >
                {workspace
                  ? "View leads"
                  : access.status === "no-workspace"
                    ? "Set up your workspace"
                    : "Sign in"}{" "}
                <Icon name="arrow-right" size="small" />
              </ButtonLink>
            )}
            <Button variant="outline" onClick={explorePlatform}>
              Explore the platform
            </Button>
          </div>
        </div>
        <ol className="dashboard-workflow" aria-label="Future operating flow">
          {dashboardWorkflow.map((stage, index) => (
            <li key={stage.label}>
              <span className="dashboard-workflow-index">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="dashboard-workflow-icon">
                <Icon name={stage.icon} />
              </span>
              <strong>{stage.label}</strong>
              {index < dashboardWorkflow.length - 1 ? (
                <Icon name="arrow-right" size="small" />
              ) : null}
            </li>
          ))}
        </ol>
      </Card>

      <section
        className="dashboard-module-section"
        id="platform-preview"
        aria-labelledby="platform-preview-title"
      >
        <div className="dashboard-section-heading">
          <div>
            <span className="app-kicker">Workspace modules</span>
            <h2 id="platform-preview-title">Ready when your data is.</h2>
          </div>
          <p>
            {workspace
              ? "Leads, Inbox and Follow-ups reflect the selected workspace. AI processing remains disconnected."
              : "Select a workspace to load business records."}
          </p>
        </div>
        {workspace ? (
          <Card className="dashboard-operations-summary">
            <div>
              <span className="app-kicker">Live workspace state</span>
              <h3>Workflow operations</h3>
            </div>
            <dl>
              {(
                [
                  ["Workflows", "workflows"],
                  ["Pending approvals", "pendingApprovals"],
                  ["Running executions", "runningExecutions"],
                  ["Failed executions", "failedExecutions"],
                  ["Unread notifications", "unreadNotifications"],
                ] as const
              ).map(([label, field]) => (
                <div key={field}>
                  <dt>{label}</dt>
                  <dd role="status">
                    {!summary
                      ? "Loading…"
                      : summary[field] === null
                        ? "Unavailable"
                        : summary[field]}
                  </dd>
                </div>
              ))}
            </dl>
            <Link href="/workflows">Manage workflows</Link>
          </Card>
        ) : null}
        <div className="dashboard-module-grid">
          {dashboardEmptyModules.map((module) => {
            let status = "Not connected";
            if ("dataKey" in module) {
              if (access.status === "loading") status = "Checking workspace…";
              else if (!workspace) status = "Workspace required";
              else if (!summary) status = "Loading…";
              else {
                const count = summary[module.dataKey];
                status =
                  count === null
                    ? "Data unavailable"
                    : count === 0
                      ? "No data yet"
                      : `${count.toLocaleString()} ${module.unit}${count === 1 ? "" : "s"}`;
              }
            }
            return (
              <Card className="dashboard-module-card" key={module.title}>
                <span className="dashboard-module-icon">
                  <Icon name={module.icon} />
                </span>
                <span className="dashboard-module-status" role="status">
                  <span aria-hidden="true" /> {status}
                </span>
                <h3>{module.title}</h3>
                <p>{module.description}</p>
                <Link href={module.href}>
                  Open {module.title} <Icon name="arrow-right" size="small" />
                </Link>
              </Card>
            );
          })}
        </div>
        {unavailable ? (
          <p className="lead-access-note" role="alert">
            Some workspace totals could not be loaded. No unavailable value is
            shown as zero.{" "}
            <button
              type="button"
              onClick={() => setRefreshToken((current) => current + 1)}
            >
              Retry totals
            </button>
          </p>
        ) : null}
      </section>
    </div>
  );
}
