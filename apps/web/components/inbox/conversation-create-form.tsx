"use client";

import { FormEvent, useState } from "react";
import type {
  ConversationChannel,
  CreateConversationRequest,
} from "@aop/types";
import { Button, Card } from "../ui/primitives";

export function ConversationCreateForm({
  onCreate,
  onCancel,
}: {
  onCreate: (input: CreateConversationRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [participantName, setParticipantName] = useState("");
  const [subject, setSubject] = useState("");
  const [channel, setChannel] = useState<ConversationChannel>("WEBSITE");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!participantName.trim()) {
      setError("Enter a participant name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate({
        participantName: participantName.trim(),
        channel,
        ...(subject.trim() ? { subject: subject.trim() } : {}),
      });
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not create the conversation.",
      );
      setBusy(false);
    }
  }

  return (
    <Card className="lead-create-card">
      <form onSubmit={submit}>
        <div className="lead-section-heading">
          <div>
            <p className="app-kicker">Internal conversation</p>
            <h2>New conversation</h2>
          </div>
        </div>
        <div className="lead-create-grid">
          <label>
            <span>Participant name</span>
            <input
              value={participantName}
              maxLength={160}
              onChange={(event) =>
                setParticipantName(event.currentTarget.value)
              }
            />
          </label>
          <label>
            <span>Subject</span>
            <input
              value={subject}
              maxLength={200}
              onChange={(event) => setSubject(event.currentTarget.value)}
            />
          </label>
          <label>
            <span>Channel context</span>
            <select
              value={channel}
              onChange={(event) =>
                setChannel(event.currentTarget.value as ConversationChannel)
              }
            >
              {(
                [
                  "WEBSITE",
                  "EMAIL",
                  "PHONE",
                  "WHATSAPP",
                  "INSTAGRAM",
                  "OTHER",
                ] as const
              ).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? (
          <p role="alert" className="lead-access-note">
            {error}
          </p>
        ) : null}
        <div className="lead-create-actions">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create conversation"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
