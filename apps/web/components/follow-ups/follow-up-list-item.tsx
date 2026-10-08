"use client";

import { useState, type FormEvent } from "react";
import { followUpTypeLabels, type FollowUp } from "../../lib/follow-ups/model";
import { Button } from "../ui/primitives";
import {
  FollowUpPriorityIndicator,
  FollowUpStatusBadge,
} from "./follow-up-indicators";

const followUpDateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  month: "short",
  timeZoneName: "short",
  year: "numeric",
});

export function FollowUpListItem({
  followUp,
  onComplete,
  onReschedule,
}: {
  followUp: FollowUp;
  onComplete: (id: string) => Promise<void>;
  onReschedule: (id: string, dueAt: string) => Promise<void>;
}) {
  const [rescheduling, setRescheduling] = useState(false);
  const [nextDueAt, setNextDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = !["COMPLETED", "CANCELLED"].includes(followUp.status);

  async function complete() {
    setBusy(true);
    setError(null);
    try {
      await onComplete(followUp.id);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not complete follow-up.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function reschedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const date = new Date(nextDueAt);
    if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
      setError("Choose a future date and time.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onReschedule(followUp.id, date.toISOString());
      setRescheduling(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not reschedule follow-up.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="follow-up-list-item">
      <div className="follow-up-item-primary">
        <strong>{followUp.title ?? "Untitled legacy record"}</strong>
        <span>
          {followUp.type ? followUpTypeLabels[followUp.type] : "Type not set"}
        </span>
        {followUp.leadId ? (
          <a href={`/leads/${encodeURIComponent(followUp.leadId)}`}>
            View related lead
          </a>
        ) : null}
      </div>
      <FollowUpStatusBadge status={followUp.status} />
      <FollowUpPriorityIndicator priority={followUp.priority} />
      <span>{followUp.owner ?? "Unassigned"}</span>
      {followUp.dueAt ? (
        <time dateTime={followUp.dueAt}>
          {followUpDateFormatter.format(new Date(followUp.dueAt))}
        </time>
      ) : (
        <span>Not scheduled</span>
      )}
      <div className="follow-up-item-actions">
        <Button
          size="small"
          variant="outline"
          disabled={!pending || busy}
          onClick={() => void complete()}
        >
          Mark complete
        </Button>
        <Button
          size="small"
          variant="outline"
          disabled={!pending || busy}
          onClick={() => setRescheduling((current) => !current)}
        >
          Reschedule
        </Button>
      </div>
      {rescheduling ? (
        <form
          className="follow-up-reschedule-form"
          onSubmit={(event) => void reschedule(event)}
        >
          <label>
            New due date and time
            <input
              required
              type="datetime-local"
              value={nextDueAt}
              onChange={(event) => setNextDueAt(event.currentTarget.value)}
            />
          </label>
          <Button size="small" disabled={busy} type="submit">
            Save date
          </Button>
          <button type="button" onClick={() => setRescheduling(false)}>
            Cancel
          </button>
        </form>
      ) : null}
      {error ? (
        <p className="follow-up-item-error" role="alert">
          {error}
        </p>
      ) : null}
    </li>
  );
}
