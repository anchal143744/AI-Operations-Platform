import type { AuthenticatedSession } from "@aop/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  leadsService,
  LeadsApiError,
} from "../apps/web/lib/leads/leads-service";
import { workspaceOptions } from "../apps/web/lib/tenancy/tenancy-service";

const workspace = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  organizationName: "Test organization",
  workspaceId: "00000000-0000-4000-8000-000000000002",
  workspaceName: "Test workspace",
  role: "SALES" as const,
};

afterEach(() => vi.unstubAllGlobals());

describe("Leads frontend API boundary", () => {
  it("derives selectable labels from session projection without treating them as authority", () => {
    const session: AuthenticatedSession = {
      user: {
        id: "u",
        email: "test@example.invalid",
        name: "Test",
        emailVerified: true,
      },
      session: { expiresAt: new Date().toISOString() },
      workspaceAccess: [
        {
          organizationId: workspace.organizationId,
          organizationName: workspace.organizationName,
          membershipId: "m",
          role: "SALES",
          workspaceIds: [workspace.workspaceId],
          workspaces: [
            { id: workspace.workspaceId, name: workspace.workspaceName },
          ],
        },
      ],
    };
    expect(workspaceOptions(session)).toEqual([workspace]);
  });

  it("sends cookie-backed workspace selectors but no user or role claim", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ items: [], page: 1, limit: 20, total: 0 }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    await leadsService.list(workspace, {
      search: "sample",
      status: ["NEW"],
      sort: "NEWEST",
    });
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/leads?");
    expect(url).toContain("search=sample");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({
      "X-AOP-Organization-Id": workspace.organizationId,
      "X-AOP-Workspace-Id": workspace.workspaceId,
    });
    expect(JSON.stringify(init)).not.toMatch(/userId|membershipId|role/);
  });

  it("translates authorization failures into a safe frontend error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: "PERMISSION_DENIED" }), {
          status: 403,
        }),
      ),
    );
    await expect(leadsService.get(workspace, "some-id")).rejects.toMatchObject({
      name: "LeadsApiError",
      status: 403,
      code: "PERMISSION_DENIED",
    } satisfies Partial<LeadsApiError>);
  });

  it("requests pipeline totals with the same cookie-backed tenant selectors", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ NEW: 0, QUALIFIED: 0 }), { status: 200 }),
      );
    vi.stubGlobal("fetch", fetcher);
    await leadsService.summary(workspace);
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/leads/summary");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({
      "X-AOP-Organization-Id": workspace.organizationId,
      "X-AOP-Workspace-Id": workspace.workspaceId,
    });
  });
});
