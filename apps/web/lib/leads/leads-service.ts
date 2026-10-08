import type {
  CreateLeadRequest,
  LeadListResponse,
  LeadPriority,
  LeadRecord,
  LeadStatusTotals,
  LeadSort,
  LeadSource,
  LeadStatus,
  UpdateLeadRequest,
} from "@aop/types";
import { apiOrigin } from "../auth/authentication-service";
import type { WorkspaceSelection } from "../tenancy/tenancy-service";

export type LeadWorkspace = WorkspaceSelection;

export class LeadsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(
      status === 401
        ? "Sign in to access your leads."
        : status === 403
          ? "You do not have access to this workspace or action."
          : status === 404
            ? "This lead is not available in the selected workspace."
            : "The Leads service is unavailable. Try again shortly.",
    );
    this.name = "LeadsApiError";
  }
}

async function request<T>(
  workspace: LeadWorkspace,
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
    let code = "LEADS_UNAVAILABLE";
    try {
      const body = (await response.json()) as { code?: string };
      if (typeof body.code === "string") code = body.code;
    } catch {
      // Do not expose a transport or server error body in the UI.
    }
    throw new LeadsApiError(response.status, code);
  }
  return (await response.json()) as T;
}

export const leadsService = {
  summary: (workspace: LeadWorkspace) =>
    request<LeadStatusTotals>(workspace, "/leads/summary"),
  list(
    workspace: LeadWorkspace,
    options: Readonly<{
      page?: number;
      limit?: number;
      search?: string;
      status?: readonly LeadStatus[];
      priority?: readonly LeadPriority[];
      source?: readonly LeadSource[];
      sort?: LeadSort;
    }> = {},
  ) {
    const query = new URLSearchParams();
    if (options.page) query.set("page", String(options.page));
    if (options.limit) query.set("limit", String(options.limit));
    if (options.search) query.set("search", options.search);
    if (options.status?.length) query.set("status", options.status.join(","));
    if (options.priority?.length)
      query.set("priority", options.priority.join(","));
    if (options.source?.length) query.set("source", options.source.join(","));
    if (options.sort) query.set("sort", options.sort);
    return request<LeadListResponse>(workspace, `/leads?${query.toString()}`);
  },
  get: (workspace: LeadWorkspace, id: string) =>
    request<LeadRecord>(workspace, `/leads/${encodeURIComponent(id)}`),
  create: (workspace: LeadWorkspace, input: CreateLeadRequest) =>
    request<LeadRecord>(workspace, "/leads", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (workspace: LeadWorkspace, id: string, input: UpdateLeadRequest) =>
    request<LeadRecord>(workspace, `/leads/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};
