"use client";

import type {
  AuthenticatedSession,
  OrganizationBootstrapRequest,
  OrganizationBootstrapResponse,
  OrganizationSummary,
  SelectWorkspaceRequest,
} from "@aop/types";
import { useCallback, useEffect, useState } from "react";
import {
  apiOrigin,
  authenticationService,
} from "../auth/authentication-service";

export type WorkspaceSelection = Readonly<{
  organizationId: string;
  organizationName: string;
  workspaceId: string;
  workspaceName: string;
  role: OrganizationSummary["role"];
}>;

type WorkspaceState = Readonly<{
  status: "loading" | "ready" | "signed-out" | "no-workspace" | "error";
  session: AuthenticatedSession | null;
  options: readonly WorkspaceSelection[];
  selected: WorkspaceSelection | null;
}>;

let selectedWorkspace: WorkspaceSelection | null = null;
const listeners = new Set<() => void>();

function emitSelection() {
  listeners.forEach((listener) => listener());
}

export function workspaceOptions(
  session: AuthenticatedSession,
): readonly WorkspaceSelection[] {
  return session.workspaceAccess.flatMap((access) =>
    access.workspaces.map((workspace) => ({
      organizationId: access.organizationId,
      organizationName: access.organizationName,
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      role: access.role,
    })),
  );
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const error = new Error(
      "Workspace setup is currently unavailable.",
    ) as Error & {
      statusCode?: number;
      code?: string;
    };
    error.statusCode = response.status;
    try {
      const problem = (await response.json()) as {
        code?: string;
        message?: string;
      };
      if (problem.code) error.code = problem.code;
      if (problem.message) error.message = problem.message;
    } catch {
      // Collapse invalid transport bodies into the stable client error.
    }
    throw error;
  }
  return (await response.json()) as T;
}

export const tenancyService = {
  listOrganizations: () =>
    request<readonly OrganizationSummary[]>("/organizations"),
  bootstrap: (input: OrganizationBootstrapRequest) =>
    request<OrganizationBootstrapResponse>("/organizations", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  selectWorkspace: (input: SelectWorkspaceRequest) =>
    request<AuthenticatedSession>("/organizations/active-workspace", {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
};

export function slugifyWorkspace(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export function useWorkspaceContext() {
  const [state, setState] = useState<WorkspaceState>({
    status: "loading",
    session: null,
    options: [],
    selected: selectedWorkspace,
  });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const sync = () =>
      setState((current) => ({ ...current, selected: selectedWorkspace }));
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  useEffect(() => {
    let active = true;
    authenticationService.getSession().then(
      (session) => {
        if (!active) return;
        const options = workspaceOptions(session);
        const persisted = session.activeWorkspace
          ? (options.find(
              (option) =>
                option.organizationId ===
                  session.activeWorkspace?.organizationId &&
                option.workspaceId === session.activeWorkspace?.workspaceId,
            ) ?? null)
          : null;
        const existing = selectedWorkspace
          ? (options.find(
              (option) =>
                option.organizationId === selectedWorkspace?.organizationId &&
                option.workspaceId === selectedWorkspace?.workspaceId,
            ) ?? null)
          : null;
        selectedWorkspace = persisted ?? existing ?? options[0] ?? null;
        setState({
          status: options.length ? "ready" : "no-workspace",
          session,
          options,
          selected: selectedWorkspace,
        });
        emitSelection();
      },
      (error: unknown) => {
        if (!active) return;
        const status =
          typeof error === "object" &&
          error !== null &&
          "statusCode" in error &&
          error.statusCode === 401
            ? "signed-out"
            : "error";
        setState({ status, session: null, options: [], selected: null });
      },
    );
    return () => {
      active = false;
    };
  }, [revision]);

  const select = useCallback(
    async (workspaceId: string) => {
      const option = state.options.find(
        (candidate) => candidate.workspaceId === workspaceId,
      );
      if (!option) throw new Error("This workspace is not available.");
      const session = await tenancyService.selectWorkspace({
        organizationId: option.organizationId,
        workspaceId: option.workspaceId,
      });
      const options = workspaceOptions(session);
      selectedWorkspace =
        options.find(
          (candidate) =>
            candidate.organizationId ===
              session.activeWorkspace?.organizationId &&
            candidate.workspaceId === session.activeWorkspace?.workspaceId,
        ) ?? null;
      setState({
        status: selectedWorkspace
          ? "ready"
          : options.length
            ? "ready"
            : "no-workspace",
        session,
        options,
        selected: selectedWorkspace,
      });
      queueMicrotask(emitSelection);
    },
    [state.options],
  );

  return {
    ...state,
    select,
    retry: () => setRevision((current) => current + 1),
  };
}
