import type {
  ConversationDetailResponse,
  ConversationListResponse,
  ConversationMessageRecord,
  ConversationRecord,
  ConversationSort,
  ConversationStatus,
  CreateConversationRequest,
  CreateMessageRequest,
} from "@aop/types";
import { apiOrigin } from "../auth/authentication-service";
import type { WorkspaceSelection } from "../tenancy/tenancy-service";

export class ConversationsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(
      status === 401
        ? "Sign in to access conversations."
        : status === 403
          ? "You do not have access to this workspace or action."
          : status === 404
            ? "This conversation is not available in the selected workspace."
            : "The Conversations service is unavailable. Try again shortly.",
    );
  }
}

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
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    let code = "CONVERSATIONS_UNAVAILABLE";
    try {
      const problem = (await response.json()) as { code?: string };
      if (problem.code) code = problem.code;
    } catch {
      // Keep transport details out of the UI.
    }
    throw new ConversationsApiError(response.status, code);
  }
  return (await response.json()) as T;
}

export const conversationsService = {
  list(
    workspace: WorkspaceSelection,
    options: Readonly<{
      page?: number;
      limit?: number;
      search?: string;
      status?: ConversationStatus;
      sort?: ConversationSort;
    }> = {},
  ) {
    const query = new URLSearchParams();
    if (options.page) query.set("page", String(options.page));
    if (options.limit) query.set("limit", String(options.limit));
    if (options.search) query.set("search", options.search);
    if (options.status) query.set("status", options.status);
    if (options.sort) query.set("sort", options.sort);
    return request<ConversationListResponse>(
      workspace,
      `/conversations?${query.toString()}`,
    );
  },
  get: (workspace: WorkspaceSelection, id: string) =>
    request<ConversationDetailResponse>(
      workspace,
      `/conversations/${encodeURIComponent(id)}`,
    ),
  create: (workspace: WorkspaceSelection, input: CreateConversationRequest) =>
    request<ConversationRecord>(workspace, "/conversations", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  send: (
    workspace: WorkspaceSelection,
    id: string,
    input: CreateMessageRequest,
  ) =>
    request<ConversationMessageRecord>(
      workspace,
      `/conversations/${encodeURIComponent(id)}/messages`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    ),
};
