import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsService } from "../apps/api/src/settings/settings.service";
import type { ActivityEventService } from "../apps/api/src/activity/activity.service";
import type { PrismaService } from "../apps/api/src/database/prisma.service";
import type { VerifiedTenantScope } from "../apps/api/src/tenancy/tenant-scope";
import {
  profileToSettings,
  settingsService,
} from "../apps/web/lib/settings/settings-service";

const scope = {
  userId: "user-a",
  membershipId: "membership-a",
  organizationId: "organization-a",
  workspaceId: "workspace-a",
  role: "OWNER",
} as unknown as VerifiedTenantScope;

const selected = {
  organizationId: scope.organizationId,
  organizationName: "Test organization",
  workspaceId: scope.workspaceId,
  workspaceName: "Test workspace",
  role: "OWNER" as const,
};

afterEach(() => vi.unstubAllGlobals());

describe("Settings tenant boundary", () => {
  it("reads the workspace profile through both tenant identifiers", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: scope.workspaceId,
      name: "Test workspace",
      settings: null,
    });
    const service = new SettingsService(
      { workspace: { findFirst } } as unknown as PrismaService,
      {} as ActivityEventService,
    );
    expect(await service.general(scope)).toMatchObject({
      workspaceName: "Test workspace",
      industry: "",
    });
    expect(findFirst.mock.calls[0][0].where).toEqual({
      id: scope.workspaceId,
      organizationId: scope.organizationId,
    });
  });

  it("reads real members only from the verified organization", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const service = new SettingsService(
      { membership: { findMany } } as unknown as PrismaService,
      {} as ActivityEventService,
    );
    expect(await service.team(scope)).toEqual([]);
    expect(findMany.mock.calls[0][0].where).toEqual({
      organizationId: scope.organizationId,
    });
  });

  it("rejects an update when no scoped workspace row was changed", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const upsert = vi.fn();
    const recordUser = vi.fn();
    const database = {
      workspace: { updateMany },
      workspaceSettings: { upsert },
    };
    const service = new SettingsService(
      {
        $transaction: (action: (db: typeof database) => Promise<unknown>) =>
          action(database),
      } as unknown as PrismaService,
      { recordUser } as unknown as ActivityEventService,
    );
    await expect(
      service.updateGeneral(scope, {
        workspaceName: "Changed",
        website: "",
        industry: "",
        companySize: "",
        timezone: "",
        responseExpectation: "",
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(updateMany.mock.calls[0][0].where).toEqual({
      id: scope.workspaceId,
      organizationId: scope.organizationId,
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(recordUser).not.toHaveBeenCalled();
  });
});

describe("Settings frontend boundary", () => {
  it("uses cookie-backed workspace selectors without client identity claims", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          workspaceName: "Test workspace",
          website: "",
          industry: "",
          companySize: "",
          timezone: "",
          responseExpectation: "",
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetcher);
    const profile = await settingsService.general(selected);
    expect(profile.workspaceName).toBe("Test workspace");
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/settings/general");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({
      "X-AOP-Organization-Id": scope.organizationId,
      "X-AOP-Workspace-Id": scope.workspaceId,
    });
    expect(JSON.stringify(init)).not.toMatch(/membershipId|userId|role/);
  });

  it("preserves known workspace profile choices", () => {
    expect(
      profileToSettings({
        workspaceName: "Test workspace",
        website: "https://example.com",
        industry: "software",
        companySize: "11–50",
        timezone: "Asia/Kolkata",
        responseExpectation: "1-hour",
      }),
    ).toMatchObject({ companySize: "11–50", industry: "software" });
  });
});
