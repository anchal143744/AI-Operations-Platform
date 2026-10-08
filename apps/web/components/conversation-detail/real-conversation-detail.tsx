"use client";

import { useCallback, useEffect, useState } from "react";
import type { ConversationDetail } from "../../lib/conversations/model";
import { conversationsService } from "../../lib/conversations/conversations-service";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";
import { ConversationDetailPage } from "./conversation-detail-page";
import { ConversationNotFound } from "./conversation-not-found";

export function RealConversationDetail({
  conversationId,
}: {
  conversationId: string;
}) {
  const access = useWorkspaceContext();
  const workspace = access.selected;
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!workspace) return;
    let active = true;
    conversationsService.get(workspace, conversationId).then(
      (result) => {
        if (!active) return;
        setDetail({ ...result, operationalActivity: [] });
        setError(null);
      },
      (failure: unknown) => {
        if (!active) return;
        setError(
          failure instanceof Error
            ? failure.message
            : "Conversation unavailable.",
        );
      },
    );
    return () => {
      active = false;
    };
  }, [workspace, conversationId, revision]);

  const send = useCallback(
    async (content: string) => {
      if (!workspace) throw new Error("Select a workspace first.");
      await conversationsService.send(workspace, conversationId, { content });
      setRevision((current) => current + 1);
    },
    [workspace, conversationId],
  );

  if (access.status === "loading")
    return (
      <p className="lead-access-note" role="status">
        Checking workspace access…
      </p>
    );
  if (!workspace) return <ConversationNotFound />;
  if (error)
    return (
      <div>
        <ConversationNotFound />
        <p className="lead-access-note" role="alert">
          {error}
        </p>
      </div>
    );
  if (!detail)
    return (
      <p className="lead-access-note" role="status">
        Loading conversation…
      </p>
    );
  return <ConversationDetailPage detail={detail} onSend={send} />;
}
