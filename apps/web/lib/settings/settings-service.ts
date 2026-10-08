import type { TeamMemberRecord, WorkspaceProfile } from "@aop/types";
import { apiOrigin } from "../auth/authentication-service";
import {
  companySizes,
  industries,
  responseExpectations,
} from "../onboarding/model";
import type { WorkspaceSelection } from "../tenancy/tenancy-service";
import type { WorkspaceSettings } from "./model";

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
        ? "Sign in to view workspace settings."
        : response.status === 403
          ? "You do not have permission to view or change these settings."
          : response.status === 400
            ? "Check the workspace profile fields and try again."
            : "Workspace settings are unavailable. Try again shortly.",
    );
  }
  return (await response.json()) as T;
}

export function profileToSettings(
  profile: WorkspaceProfile,
): WorkspaceSettings {
  return {
    workspaceName: profile.workspaceName,
    website: profile.website,
    industry: industries.some((item) => item.value === profile.industry)
      ? (profile.industry as WorkspaceSettings["industry"])
      : "",
    companySize: companySizes.some((size) => size === profile.companySize)
      ? (profile.companySize as WorkspaceSettings["companySize"])
      : "",
    timezone: profile.timezone,
    responseExpectation: responseExpectations.some(
      (item) => item.value === profile.responseExpectation,
    )
      ? (profile.responseExpectation as WorkspaceSettings["responseExpectation"])
      : "",
  };
}

export const settingsService = {
  general: (workspace: WorkspaceSelection) =>
    request<WorkspaceProfile>(workspace, "/settings/general"),
  updateGeneral: (workspace: WorkspaceSelection, input: WorkspaceSettings) =>
    request<WorkspaceProfile>(workspace, "/settings/general", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  team: (workspace: WorkspaceSelection) =>
    request<readonly TeamMemberRecord[]>(workspace, "/settings/team"),
};
