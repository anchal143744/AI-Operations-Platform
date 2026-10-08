import { afterEach, describe, expect, it, vi } from "vitest";
import { FollowUpsService } from "../apps/api/src/follow-ups/follow-ups.service";
import type { ActivityEventService } from "../apps/api/src/activity/activity.service";
import type { PrismaService } from "../apps/api/src/database/prisma.service";
import type { VerifiedTenantScope } from "../apps/api/src/tenancy/tenant-scope";
import { followUpsService } from "../apps/web/lib/follow-ups/follow-ups-service";
import { initialFollowUpFilterState } from "../apps/web/lib/follow-ups/model";

const scope = {
  userId: "user-a",
  membershipId: "membership-a",
  organizationId: "organization-a",
  workspaceId: "workspace-a",
  role: "OWNER",
} as unknown as VerifiedTenantScope;

const workspace = {
  organizationId: scope.organizationId,
  organizationName: "Test organization",
  workspaceId: scope.workspaceId,
  workspaceName: "Test workspace",
  role: "OWNER" as const,
};

afterEach(() => vi.unstubAllGlobals());

describe("Follow-ups tenant-scoped service", () => {
  it("lists only the verified organization and workspace", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const prisma = {
      followUp: { findMany, count },
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, {} as ActivityEventService);
    const result = await service.list(scope, { page: 1, limit: 20 });
    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 });
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    });
    expect(count.mock.calls[0][0].where).toMatchObject({
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    });
  });

  it("derives real summary totals from scoped database counts", async () => {
    const count = vi
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);
    const prisma = {
      followUp: { count },
      $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
    } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, {} as ActivityEventService);
    expect(await service.summary(scope)).toEqual({
      DUE_TODAY: 1,
      UPCOMING: 2,
      OVERDUE: 3,
      COMPLETED: 4,
    });
    for (const call of count.mock.calls) {
      expect(call[0].where).toMatchObject({
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
      });
    }
  });

  it("denies a cross-workspace completion without recording an event", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const recordUser = vi.fn();
    const database = { followUp: { updateMany } };
    const prisma = {
      $transaction: (action: (db: typeof database) => Promise<unknown>) =>
        action(database),
    } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, {
      recordUser,
    } as unknown as ActivityEventService);
    await expect(service.complete(scope, "foreign-id")).rejects.toMatchObject({
      status: 404,
    });
    expect(updateMany.mock.calls[0][0].where).toMatchObject({
      id: "foreign-id",
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      state: "PENDING",
    });
    expect(recordUser).not.toHaveBeenCalled();
  });

  it("rejects dates in the past before a database write", async () => {
    const prisma = { $transaction: vi.fn() } as unknown as PrismaService;
    const service = new FollowUpsService(prisma, {} as ActivityEventService);
    await expect(
      service.create(scope, {
        title: "Past follow-up",
        type: "CALL",
        priority: "LOW",
        dueAt: "2020-01-01T00:00:00.000Z",
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("Follow-ups frontend API boundary", () => {
  it("sends cookie-backed tenant selectors but no identity or role claims", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ items: [], page: 1, limit: 20, total: 0 }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    await followUpsService.list(workspace, {
      page: 1,
      limit: 20,
      search: "call",
      view: "UPCOMING",
      filters: initialFollowUpFilterState,
    });
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/follow-ups?");
    expect(url).toContain("search=call");
    expect(init.credentials).toBe("include");
    expect(init.headers).toMatchObject({
      "X-AOP-Organization-Id": scope.organizationId,
      "X-AOP-Workspace-Id": scope.workspaceId,
    });
    expect(JSON.stringify(init)).not.toMatch(
      /membershipId|userId|actorId|role/,
    );
  });

  it("does not mask authorization failure as an empty queue", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 403 })),
    );
    await expect(followUpsService.summary(workspace)).rejects.toThrow(
      "do not have access",
    );
  });
});
