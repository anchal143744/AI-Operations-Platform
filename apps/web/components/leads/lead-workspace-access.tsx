"use client";

import Link from "next/link";
import { useWorkspaceContext } from "../../lib/tenancy/tenancy-service";

export const useLeadWorkspaceAccess = useWorkspaceContext;

export function LeadWorkspaceAccess({
  access,
}: {
  access: ReturnType<typeof useLeadWorkspaceAccess>;
}) {
  if (access.status === "loading") {
    return (
      <p className="lead-access-note" role="status">
        Checking workspace access…
      </p>
    );
  }
  if (access.status === "signed-out") {
    return (
      <p className="lead-access-note" role="status">
        Sign in to view real workspace leads. <Link href="/login">Sign in</Link>
      </p>
    );
  }
  if (access.status === "no-workspace") {
    return (
      <p className="lead-access-note" role="status">
        No active workspace is available.{" "}
        <Link href="/onboarding">Set up your workspace</Link>.
      </p>
    );
  }
  if (access.status === "error") {
    return (
      <div className="lead-access-note" role="alert">
        Could not check workspace access.{" "}
        <button type="button" onClick={access.retry}>
          Try again
        </button>
      </div>
    );
  }
  return (
    <div className="lead-access-note">
      {access.options.length > 1 ? (
        <label>
          <span>Workspace for real leads</span>
          <select
            value={access.selected?.workspaceId ?? ""}
            onChange={(event) => access.select(event.currentTarget.value)}
          >
            <option value="">Select a workspace</option>
            {access.options.map((option) => (
              <option key={option.workspaceId} value={option.workspaceId}>
                {option.organizationName} / {option.workspaceName}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <span>
          Real workspace: {access.selected?.organizationName} /{" "}
          {access.selected?.workspaceName}
        </span>
      )}
      <small>
        The server revalidates this organization and workspace for every
        request.
      </small>
    </div>
  );
}
