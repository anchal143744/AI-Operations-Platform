import type {
  CreateFollowUpRequest,
  FollowUpListResponse,
  FollowUpRecord,
  FollowUpSummary,
} from "@aop/types";
import { apiOrigin } from "../auth/authentication-service";
import type { WorkspaceSelection } from "../tenancy/tenancy-service";
import type { FollowUpFilterState, FollowUpView } from "./model";

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
    throw new Error(
      response.status === 401
        ? "Sign in to use follow-ups."
        : response.status === 403
          ? "You do not have access to this workspace or action."
          : response.status === 404
            ? "This follow-up is not available in the selected workspace."
            : response.status === 400
              ? "Check the follow-up details and try again."
              : "The Follow-ups service is unavailable. Try again shortly.",
    );
  }
  return (await response.json()) as T;
}

export const followUpsService = {
  summary: (workspace: WorkspaceSelection) =>
    request<FollowUpSummary>(workspace, "/follow-ups/summary"),
  list(
    workspace: WorkspaceSelection,
    options: Readonly<{
      page: number;
      limit: number;
      search: string;
      view: FollowUpView;
      filters: FollowUpFilterState;
    }>,
  ) {
    const query = new URLSearchParams({
      page: String(options.page),
      limit: String(options.limit),
      view: options.view,
      sort: options.filters.sort,
    });
    if (options.search.trim()) query.set("search", options.search.trim());
    if (options.filters.statuses.length)
      query.set("status", options.filters.statuses.join(","));
    if (options.filters.priorities.length)
      query.set("priority", options.filters.priorities.join(","));
    if (options.filters.types.length)
      query.set("type", options.filters.types.join(","));
    if (options.filters.date !== "ANY") query.set("date", options.filters.date);
    return request<FollowUpListResponse>(
      workspace,
      `/follow-ups?${query.toString()}`,
    );
  },
  create: (workspace: WorkspaceSelection, input: CreateFollowUpRequest) =>
    request<FollowUpRecord>(workspace, "/follow-ups", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  complete: (workspace: WorkspaceSelection, id: string) =>
    request<FollowUpRecord>(
      workspace,
      `/follow-ups/${encodeURIComponent(id)}/complete`,
      { method: "PATCH" },
    ),
  reschedule: (workspace: WorkspaceSelection, id: string, dueAt: string) =>
    request<FollowUpRecord>(
      workspace,
      `/follow-ups/${encodeURIComponent(id)}/reschedule`,
      { method: "PATCH", body: JSON.stringify({ dueAt }) },
    ),
};
