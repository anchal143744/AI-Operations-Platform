import { apiOrigin } from "../auth/authentication-service";
import type { WorkspaceSelection } from "../tenancy/tenancy-service";

export type WorkspaceNotification = Readonly<{
  id: string;
  title: string;
  body: string;
  workflowExecutionId: string;
  workflowExecution: Readonly<{ workflowId: string }>;
  createdAt: string;
  readAt: string | null;
}>;

export type NotificationList = Readonly<{
  items: readonly WorkspaceNotification[];
  unreadCount: number;
}>;

async function request<T>(
  workspace: WorkspaceSelection,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "X-AOP-Organization-Id": workspace.organizationId,
      "X-AOP-Workspace-Id": workspace.workspaceId,
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Sign in to view notifications."
        : response.status === 403
          ? "This workspace is not available to you."
          : "Notifications could not be loaded. Try again.",
    );
  }
  return (await response.json()) as T;
}

export const notificationsService = {
  list: (workspace: WorkspaceSelection) =>
    request<NotificationList>(workspace, "/notifications"),
  markRead: (workspace: WorkspaceSelection, id: string) =>
    request<WorkspaceNotification>(
      workspace,
      `/notifications/${encodeURIComponent(id)}/read`,
      { method: "PATCH" },
    ),
};
