"use client";

import type { CreateFollowUpRequest, LeadRecord } from "@aop/types";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  followUpPriorities,
  followUpPriorityLabels,
  followUpTypes,
  followUpTypeLabels,
  type FollowUpPriority,
  type FollowUpType,
} from "../../lib/follow-ups/model";
import { leadsService } from "../../lib/leads/leads-service";
import type { WorkspaceSelection } from "../../lib/tenancy/tenancy-service";
import { Button } from "../ui/primitives";

export function FollowUpCreateForm({
  workspace,
  onCreate,
  onCancel,
}: {
  workspace: WorkspaceSelection;
  onCreate: (input: CreateFollowUpRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<FollowUpType>("CALL");
  const [priority, setPriority] = useState<FollowUpPriority>("MEDIUM");
  const [dueAt, setDueAt] = useState("");
  const [leadId, setLeadId] = useState("");
  const [leads, setLeads] = useState<readonly LeadRecord[]>([]);
  const [leadsError, setLeadsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    titleRef.current?.focus();
    let active = true;
    void leadsService.list(workspace, { limit: 100 }).then(
      (response) => {
        if (active) setLeads(response.items);
      },
      () => {
        if (active) setLeadsError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [workspace]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const date = new Date(dueAt);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      setError("Choose a future date and time.");
      return;
    }
    setBusy(true);
    try {
      await onCreate({
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        type,
        priority,
        dueAt: date.toISOString(),
        ...(leadId ? { leadId } : {}),
      });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not create follow-up.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="follow-up-create-form"
      aria-labelledby="follow-up-create-title"
    >
      <div>
        <p className="app-kicker">New operational action</p>
        <h2 id="follow-up-create-title">Schedule a follow-up</h2>
        <p>
          Record a real next action in the selected workspace. No message is
          sent automatically.
        </p>
      </div>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          <span>Action title</span>
          <input
            ref={titleRef}
            required
            maxLength={160}
            value={title}
            onChange={(event) => setTitle(event.currentTarget.value)}
            placeholder="Call about the enquiry"
          />
        </label>
        <label>
          <span>Due date and time</span>
          <input
            type="datetime-local"
            required
            value={dueAt}
            onChange={(event) => setDueAt(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>Type</span>
          <select
            value={type}
            onChange={(event) =>
              setType(event.currentTarget.value as FollowUpType)
            }
          >
            {followUpTypes.map((value) => (
              <option key={value} value={value}>
                {followUpTypeLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Priority</span>
          <select
            value={priority}
            onChange={(event) =>
              setPriority(event.currentTarget.value as FollowUpPriority)
            }
          >
            {followUpPriorities.map((value) => (
              <option key={value} value={value}>
                {followUpPriorityLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Related lead (optional)</span>
          <select
            value={leadId}
            onChange={(event) => setLeadId(event.currentTarget.value)}
            disabled={leadsError}
          >
            <option value="">No lead linked</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.name}
                {lead.company ? ` · ${lead.company}` : ""}
              </option>
            ))}
          </select>
        </label>
        {leadsError ? (
          <p role="alert">
            Lead choices are unavailable. You can create an unlinked follow-up.
          </p>
        ) : null}
        <label className="follow-up-create-description">
          <span>Context (optional)</span>
          <textarea
            maxLength={2000}
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
          />
        </label>
        {error ? <p role="alert">{error}</p> : null}
        <div className="follow-up-create-actions">
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Create follow-up"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      </form>
    </section>
  );
}
