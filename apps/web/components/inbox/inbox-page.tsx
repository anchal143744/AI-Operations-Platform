"use client";

import { useCallback, useEffect, useState } from "react";
import {
  initialConversationFilterState,
  type Conversation,
} from "../../lib/conversations/model";
import { conversationsService } from "../../lib/conversations/conversations-service";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";
import { Icon } from "../icons";
import { ConversationWorkspace } from "./conversation-workspace";
import { InboxHeader } from "./inbox-header";
import { ConversationCreateForm } from "./conversation-create-form";

export function InboxPage() {
  const [notice, setNotice] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(initialConversationFilterState);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [controlNotice, setControlNotice] = useState("");
  const [conversations, setConversations] = useState<readonly Conversation[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const access = useWorkspaceContext();
  const workspace = access.selected;
  const [createOpen, setCreateOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const openFilters = useCallback(() => setFiltersOpen(true), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  useEffect(() => {
    if (!workspace) {
      setConversations([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setLoadError(null);
      conversationsService
        .list(workspace, {
          ...(query.trim() ? { search: query.trim() } : {}),
          ...(filters.statuses[0] ? { status: filters.statuses[0] } : {}),
          sort:
            filters.sort === "OLDEST_ACTIVITY"
              ? "OLDEST_ACTIVITY"
              : "NEWEST_ACTIVITY",
        })
        .then(
          (result) => {
            if (!active) return;
            setConversations(result.items);
            setLoading(false);
          },
          (error: unknown) => {
            if (!active) return;
            setConversations([]);
            setLoadError(
              error instanceof Error
                ? error.message
                : "Could not load conversations.",
            );
            setLoading(false);
          },
        );
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [workspace, query, filters, revision]);

  return (
    <div className="inbox-page">
      <InboxHeader
        onNewConversation={() =>
          workspace
            ? setCreateOpen(true)
            : setNotice("Sign in and select a workspace first.")
        }
      />

      {createOpen && workspace ? (
        <ConversationCreateForm
          onCancel={() => setCreateOpen(false)}
          onCreate={async (input) => {
            await conversationsService.create(workspace, input);
            setCreateOpen(false);
            setRevision((current) => current + 1);
            setNotice("Conversation created in the selected workspace.");
          }}
        />
      ) : null}

      {notice ? (
        <div className="inbox-page-notice" role="status">
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

      {access.status === "loading" ? (
        <p className="lead-access-note" role="status">
          Checking workspace access…
        </p>
      ) : null}
      {access.status === "signed-out" ? (
        <p className="lead-access-note">Sign in to view real conversations.</p>
      ) : null}
      {access.status === "no-workspace" ? (
        <p className="lead-access-note">
          Complete onboarding to create your first workspace.
        </p>
      ) : null}
      {loading ? (
        <p className="lead-access-note" role="status">
          Loading conversations…
        </p>
      ) : null}
      {loadError ? (
        <p className="lead-access-note" role="alert">
          {loadError}
        </p>
      ) : null}

      <ConversationWorkspace
        conversations={conversations}
        query={query}
        filters={filters}
        filtersOpen={filtersOpen}
        onQueryChange={(value) => {
          setQuery(value);
          setControlNotice(
            value
              ? "Conversation search updated."
              : "Conversation search cleared.",
          );
        }}
        onFiltersOpen={openFilters}
        onFiltersClose={closeFilters}
        onFiltersChange={(nextFilters) => {
          setFilters(nextFilters);
          setControlNotice("Inbox filters updated.");
        }}
        onUnavailable={setNotice}
      />
      <p className="sr-only" role="status" aria-live="polite">
        {controlNotice}
      </p>
    </div>
  );
}
