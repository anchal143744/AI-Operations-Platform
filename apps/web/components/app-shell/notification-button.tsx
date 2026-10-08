"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  notificationsService,
  type NotificationList,
} from "../../lib/app-shell/notifications-service";
import type { WorkspaceSelection } from "../../lib/tenancy/tenancy-service";
import { Icon } from "../icons";

export function NotificationButton({
  workspace,
}: {
  workspace: WorkspaceSelection | null;
}) {
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    key: string;
    data: NotificationList;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const key = workspace
    ? `${workspace.organizationId}:${workspace.workspaceId}`
    : null;
  const data = snapshot?.key === key ? snapshot.data : null;

  const refresh = useCallback(async () => {
    if (!workspace || !key) return;
    try {
      const result = await notificationsService.list(workspace);
      setSnapshot({ key, data: result });
      setError(null);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Notifications could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [workspace, key]);

  useEffect(() => {
    if (!workspace) return;
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [workspace, refresh]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function markRead(id: string) {
    if (!workspace || busyId) return;
    setBusyId(id);
    try {
      await notificationsService.markRead(workspace, id);
      await refresh();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "Could not mark as read.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="app-menu-root notification-root">
      <button
        ref={triggerRef}
        className="app-icon-button notification-button"
        type="button"
        aria-label={
          data?.unreadCount
            ? `Open notifications, ${data.unreadCount} unread`
            : "Open notifications"
        }
        aria-expanded={open}
        aria-controls="workspace-notifications"
        onClick={() => {
          setOpen((value) => !value);
          if (!open && workspace) {
            setLoading(true);
            void refresh();
          }
        }}
      >
        <Icon name="bell" />
        {data?.unreadCount ? (
          <span className="notification-count" aria-hidden="true">
            {Math.min(data.unreadCount, 99)}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          ref={panelRef}
          className="app-popover notification-popover"
          id="workspace-notifications"
          role="region"
          aria-label="Workspace notifications"
          tabIndex={-1}
        >
          <div className="notification-popover-head">
            <strong>Notifications</strong>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Close notifications"
            >
              <Icon name="x" size="small" />
            </button>
          </div>
          {!workspace ? (
            <p>Sign in and select a workspace to see notifications.</p>
          ) : null}
          {loading && !data ? (
            <p role="status">Loading notifications…</p>
          ) : null}
          {error ? (
            <p role="alert">
              {error}{" "}
              <button type="button" onClick={() => void refresh()}>
                Retry
              </button>
            </p>
          ) : null}
          {data?.items.length === 0 ? (
            <p role="status">No notifications in this workspace yet.</p>
          ) : null}
          {data?.items.map((notification) => (
            <article className="notification-item" key={notification.id}>
              <strong>{notification.title}</strong>
              <p>{notification.body}</p>
              <small>{new Date(notification.createdAt).toLocaleString()}</small>
              <Link
                href={`/workflows#workflow-${encodeURIComponent(notification.workflowExecution.workflowId)}`}
                onClick={() => setOpen(false)}
              >
                View workflow execution
              </Link>
              {!notification.readAt ? (
                <button
                  type="button"
                  disabled={busyId === notification.id}
                  onClick={() => void markRead(notification.id)}
                >
                  Mark as read
                </button>
              ) : (
                <small>Read</small>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}
