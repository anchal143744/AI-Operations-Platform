"use client";

import type { LeadRecord, LeadStatus } from "@aop/types";
import { useEffect, useState } from "react";
import {
  leadStatusLabels,
  leadStatuses,
  type LeadDetail,
} from "../../lib/leads/model";
import { leadsService } from "../../lib/leads/leads-service";
import { Button } from "../ui/primitives";
import {
  LeadWorkspaceAccess,
  useLeadWorkspaceAccess,
} from "../leads/lead-workspace-access";
import { LeadDetailPage } from "./lead-detail-page";
import { LeadNotFound } from "./lead-not-found";

export function RealLeadDetail({ leadId }: { leadId: string }) {
  const access = useLeadWorkspaceAccess();
  const workspace = access.selected;
  const [lead, setLead] = useState<LeadRecord | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "not-found" | "error"
  >("loading");
  const [nextStatus, setNextStatus] = useState<LeadStatus>("NEW");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace) {
      setLead(null);
      return;
    }
    let active = true;
    setStatus("loading");
    leadsService.get(workspace, leadId).then(
      (result) => {
        if (!active) return;
        setLead(result);
        setNextStatus(result.status);
        setStatus("ready");
      },
      (error: unknown) => {
        if (!active) return;
        setLead(null);
        setStatus(
          typeof error === "object" &&
            error !== null &&
            "status" in error &&
            error.status === 404
            ? "not-found"
            : "error",
        );
      },
    );
    return () => {
      active = false;
    };
  }, [workspace, leadId]);

  async function changeStatus() {
    if (!workspace || !lead || saving) return;
    setSaving(true);
    setNotice(null);
    try {
      const updated = await leadsService.update(workspace, lead.id, {
        status: nextStatus,
      });
      setLead(updated);
      setNotice("Lead status updated in the selected workspace.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Could not update lead status.",
      );
    } finally {
      setSaving(false);
    }
  }

  const detail: LeadDetail | null = lead
    ? {
        lead,
        enquiryContext: "",
        activity: [],
        notes: [],
        tags: [],
        aiContext: null,
        nextAction: null,
      }
    : null;

  return (
    <div className="real-lead-detail">
      <LeadWorkspaceAccess access={access} />
      {workspace && status === "loading" ? (
        <p className="lead-access-note" role="status">
          Loading lead…
        </p>
      ) : null}
      {workspace && status === "not-found" ? (
        <LeadNotFound demo={false} />
      ) : null}
      {workspace && status === "error" ? (
        <p className="lead-access-note" role="alert">
          Could not load this lead. Try again shortly.
        </p>
      ) : null}
      {workspace && status === "ready" && detail ? (
        <>
          <div className="lead-status-control">
            <label htmlFor="real-lead-status">Lead status</label>
            <select
              id="real-lead-status"
              value={nextStatus}
              onChange={(event) =>
                setNextStatus(event.currentTarget.value as LeadStatus)
              }
              disabled={saving}
            >
              {leadStatuses.map((value) => (
                <option key={value} value={value}>
                  {leadStatusLabels[value]}
                </option>
              ))}
            </select>
            <Button
              size="small"
              onClick={() => void changeStatus()}
              disabled={saving || nextStatus === lead?.status}
            >
              {saving ? "Saving…" : "Save status"}
            </Button>
          </div>
          {notice ? (
            <p className="lead-access-note" role="status">
              {notice}
            </p>
          ) : null}
          <LeadDetailPage detail={detail} demo={false} />
        </>
      ) : null}
    </div>
  );
}
