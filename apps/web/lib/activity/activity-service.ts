import type { ActivityListResponse } from "@aop/types";
import { apiOrigin } from "../auth/authentication-service";
import type { WorkspaceSelection } from "../tenancy/tenancy-service";
import type { ActivityView } from "./model";

export type ActivityQuery = Readonly<{
  page?: number;
  search?: string;
  category?: ActivityView;
  actorType?: string;
  dateRange?: "ANY" | "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS";
  sort?: "NEWEST" | "OLDEST";
  workflowId?: string;
}>;

export const activityService = {
  async list(
    workspace: WorkspaceSelection,
    query: ActivityQuery = {},
  ): Promise<ActivityListResponse> {
    const params = new URLSearchParams({
      page: String(query.page ?? 1),
      limit: "50",
      sort: query.sort ?? "NEWEST",
      category: query.category ?? "ALL",
    });
    if (query.search?.trim()) params.set("search", query.search.trim());
    if (query.actorType) params.set("actorType", query.actorType);
    if (query.dateRange && query.dateRange !== "ANY") {
      params.set("dateRange", query.dateRange);
    }
    if (query.workflowId) params.set("workflowId", query.workflowId);
    const response = await fetch(`${apiOrigin}/activity?${params}`, {
      credentials: "include",
      cache: "no-store",
      headers: {
        "X-AOP-Organization-Id": workspace.organizationId,
        "X-AOP-Workspace-Id": workspace.workspaceId,
      },
    });
    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Your session has expired. Sign in again."
          : response.status === 403
            ? "You do not have permission to view activity in this workspace."
            : response.status === 400
              ? "Check the activity filters and try again."
              : "Activity is unavailable. Try again.",
      );
    }
    return (await response.json()) as ActivityListResponse;
  },
};
