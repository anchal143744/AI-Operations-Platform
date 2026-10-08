"use client";

import { FormEvent, useState } from "react";
import { MESSAGING_UNAVAILABLE_MESSAGE } from "../../lib/conversations/model";
import { Icon } from "../icons";
import { Button, Card } from "../ui/primitives";

export function MessageComposer({
  onSend,
}: {
  onSend?: (content: string) => Promise<void>;
}) {
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!onSend || !content.trim() || sending) return;
    setSending(true);
    setStatus("");
    try {
      await onSend(content.trim());
      setContent("");
      setStatus("Message recorded in this conversation.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Could not record the message.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <Card className="conversation-detail-card message-composer conversation-area-composer">
      <form onSubmit={submit}>
        <div className="conversation-card-heading">
          <span className="conversation-card-icon" aria-hidden="true">
            <Icon name="draft" />
          </span>
          <div>
            <p className="app-kicker">
              {onSend ? "Internal record" : "Channel unavailable"}
            </p>
            <h2>Response composer</h2>
          </div>
        </div>
        <label htmlFor="demo-message-composer">Message</label>
        <textarea
          id="demo-message-composer"
          disabled={!onSend || sending}
          value={content}
          onChange={(event) => setContent(event.currentTarget.value)}
          rows={4}
          placeholder="Write a response"
          aria-describedby="composer-unavailable"
        />
        <p id="composer-unavailable" role="status">
          {onSend
            ? "This records an internal message only; no external channel delivery occurs."
            : MESSAGING_UNAVAILABLE_MESSAGE}
        </p>
        <div className="message-composer-actions">
          <Button variant="outline" size="small" disabled>
            <Icon name="draft" size="small" />
            Attachment
          </Button>
          <Button variant="outline" size="small" disabled>
            <Icon name="spark" size="small" />
            AI assist
          </Button>
          <Button size="small" disabled={!onSend || sending || !content.trim()}>
            {sending ? "Recording…" : "Record message"}
            <Icon name="arrow-right" size="small" />
          </Button>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </form>
    </Card>
  );
}
