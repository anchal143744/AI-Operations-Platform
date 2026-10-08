import { describe, expect, it, vi } from "vitest";
import { LeadsService } from "../apps/api/src/leads/leads.service";
import type { ActivityEventService } from "../apps/api/src/activity/activity.service";
import type { PrismaService } from "../apps/api/src/database/prisma.service";
import type { VerifiedTenantScope } from "../apps/api/src/tenancy/tenant-scope";

const scope = {
  userId: "user-a",
  membershipId: "membership-a",
  organizationId: "organization-a",
  workspaceId: "workspace-a",
  role: "OWNER",
} as unknown as VerifiedTenantScope;

describe("tenant-scoped lead pipeline summary", () => {
  it("counts only the verified tenant's statuses and retains real zeros", async () => {
    const groupBy = vi.fn().mockResolvedValue([
      { status: "NEW", _count: { _all: 2 } },
      { status: "QUALIFIED", _count: { _all: 1 } },
    ]);
    const prisma = { lead: { groupBy } } as unknown as PrismaService;
    const service = new LeadsService(prisma, {} as ActivityEventService);

    expect(await service.summary(scope)).toEqual({
      NEW: 2,
      CONTACTED: 0,
      QUALIFIED: 1,
      IN_PROGRESS: 0,
      CONVERTED: 0,
      LOST: 0,
    });
    expect(groupBy).toHaveBeenCalledWith({
      by: ["status"],
      where: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
      },
      _count: { _all: true },
    });
  });
});
