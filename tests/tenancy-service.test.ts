import type { AuthenticatedSession } from "@aop/types";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  slugifyWorkspace,
  tenancyService,
  workspaceOptions,
} from "../apps/web/lib/tenancy/tenancy-service";

afterEach(() => vi.unstubAllGlobals());

describe("frontend tenancy boundary", () => {
  it("projects only server-verified workspace access into selectors", () => {
    const session: AuthenticatedSession = {
      user: {
        id: "user",
        email: "owner@example.invalid",
        name: "Owner",
        emailVerified: true,
      },
      session: { expiresAt: new Date().toISOString() },
      workspaceAccess: [
        {
          organizationId: "org",
          organizationName: "Operations",
          membershipId: "membership",
          role: "OWNER",
          workspaceIds: ["workspace"],
          workspaces: [{ id: "workspace", name: "Primary" }],
        },
      ],
    };

    expect(workspaceOptions(session)).toEqual([
      {
        organizationId: "org",
        organizationName: "Operations",
        workspaceId: "workspace",
        workspaceName: "Primary",
        role: "OWNER",
      },
    ]);
  });

  it("bootstraps using the cookie session without browser-supplied identity", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ organization: {}, workspace: {} }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);

    await tenancyService.bootstrap({
      name: "Acme Operations",
      slug: "acme-operations",
      workspaceName: "Acme Workspace",
      workspaceSlug: "acme-workspace",
    });

    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
    expect(JSON.stringify(init)).not.toMatch(/userId|membershipId|role/);
  });

  it("normalizes workspace slugs without retaining unsafe separators", () => {
    expect(slugifyWorkspace("  Northstar & Sales  ")).toBe("northstar-sales");
  });
});
