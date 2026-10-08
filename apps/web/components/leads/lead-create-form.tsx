"use client";

import type { CreateLeadRequest, LeadPriority, LeadSource } from "@aop/types";
import { type FormEvent, useState } from "react";
import {
  leadPriorities,
  leadSources,
  leadSourceLabels,
} from "../../lib/leads/model";
import { Button } from "../ui/primitives";

export function LeadCreateForm({
  onCreate,
  onCancel,
}: {
  onCreate: (input: CreateLeadRequest) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const data = new FormData(event.currentTarget);
    const optional = (name: string) => String(data.get(name) ?? "").trim();
    const input: CreateLeadRequest = {
      name: optional("name"),
      ...(optional("company") ? { company: optional("company") } : {}),
      ...(optional("email") ? { email: optional("email") } : {}),
      ...(optional("phone") ? { phone: optional("phone") } : {}),
      source: String(data.get("source")) as LeadSource,
      priority: String(data.get("priority")) as LeadPriority,
    };
    setSaving(true);
    setError(null);
    try {
      await onCreate(input);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not create this lead.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="lead-create-form"
      onSubmit={(event) => void submit(event)}
      aria-busy={saving}
    >
      <div>
        <p className="app-kicker">Manual lead intake</p>
        <h2>Create lead</h2>
        <p>Saved only to the selected, authenticated workspace.</p>
      </div>
      <div className="lead-create-fields">
        <label>
          Lead name{" "}
          <input
            name="name"
            required
            minLength={1}
            maxLength={160}
            disabled={saving}
          />
        </label>
        <label>
          Company <input name="company" maxLength={160} disabled={saving} />
        </label>
        <label>
          Work email{" "}
          <input name="email" type="email" maxLength={320} disabled={saving} />
        </label>
        <label>
          Phone{" "}
          <input name="phone" type="tel" maxLength={40} disabled={saving} />
        </label>
        <label>
          Source
          <select name="source" defaultValue="MANUAL" disabled={saving}>
            {leadSources.map((source) => (
              <option key={source} value={source}>
                {leadSourceLabels[source]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select name="priority" defaultValue="MEDIUM" disabled={saving}>
            {leadPriorities.map((priority) => (
              <option key={priority} value={priority}>
                {priority.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? (
        <p role="alert" className="lead-form-error">
          {error}
        </p>
      ) : null}
      <div className="lead-create-actions">
        <Button type="submit" disabled={saving}>
          {saving ? "Creating…" : "Create lead"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
