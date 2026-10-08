import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  WorkspaceStatus,
} from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { TenantContextService } from "../apps/api/src/tenancy/tenant-context.service";
import { tenantOwnedWhere } from "../apps/api/src/tenancy/tenant-scope";
import {
  buildMembership,
  buildSession,
  buildTenantScope,
  buildWorkspace,
  ids,
} from "./authorization-fixtures";

function serviceWith(
  membership: ReturnType<typeof buildMembership> | null,
  workspace: ReturnType<typeof buildWorkspace> | null,
) {
  const findUnique = vi.fn().mockResolvedValue(membership);
  const findFirst = vi.fn().mockResolvedValue(workspace);
  const service = new TenantContextService({
    membership: { findUnique },
    workspace: { findFirst },
  } as never);
  return { service, findUnique, findFirst };
}

describe("verified tenant context", () => {
  it("uses session identity and current persisted membership role", async () => {
    const { service, findUnique, findFirst } = serviceWith(
      buildMembership({ role: MembershipRole.MANAGER }),
      buildWorkspace(),
    );
    const context = await service.resolve(
      buildSession(),
      ids.organization,
      ids.workspace,
    );

    expect(context).toMatchObject({
      userId: ids.user,
      membershipId: ids.membership,
      organizationId: ids.organization,
      workspaceId: ids.workspace,
      role: MembershipRole.MANAGER,
    });
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_organizationId: {
            userId: ids.user,
            organizationId: ids.organization,
          },
        },
      }),
    );
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ids.workspace, organizationId: ids.organization },
      }),
    );
  });

  it("rejects missing and cross-organization memberships", async () => {
    const { service, findFirst } = serviceWith(null, buildWorkspace());
    await expect(
      service.resolve(buildSession(), ids.otherOrganization, ids.workspace),
    ).rejects.toMatchObject({ response: { code: "MEMBERSHIP_REQUIRED" } });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it("rejects a membership result for another user or organization", async () => {
    for (const membership of [
      buildMembership({ userId: ids.otherUser }),
      buildMembership({ organizationId: ids.otherOrganization }),
    ]) {
      const { service, findFirst } = serviceWith(membership, buildWorkspace());
      await expect(
        service.resolve(buildSession(), ids.organization, ids.workspace),
      ).rejects.toMatchObject({ response: { code: "MEMBERSHIP_REQUIRED" } });
      expect(findFirst).not.toHaveBeenCalled();
    }
  });

  it.each([
    MembershipStatus.INVITED,
    MembershipStatus.SUSPENDED,
    MembershipStatus.REVOKED,
  ])("rejects %s memberships", async (status) => {
    const { service, findFirst } = serviceWith(
      buildMembership({ status }),
      buildWorkspace(),
    );
    await expect(
      service.resolve(buildSession(), ids.organization, ids.workspace),
    ).rejects.toMatchObject({ response: { code: "MEMBERSHIP_INACTIVE" } });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it.each([OrganizationStatus.SUSPENDED, OrganizationStatus.DISABLED])(
    "rejects %s organizations",
    async (status) => {
      const { service } = serviceWith(
        buildMembership({ organization: { id: ids.organization, status } }),
        buildWorkspace(),
      );
      await expect(
        service.resolve(buildSession(), ids.organization, ids.workspace),
      ).rejects.toMatchObject({ response: { code: "ORGANIZATION_INACTIVE" } });
    },
  );

  it("rejects missing, foreign, and cross-organization workspaces", async () => {
    const { service } = serviceWith(buildMembership(), null);
    await expect(
      service.resolve(buildSession(), ids.organization, ids.otherWorkspace),
    ).rejects.toMatchObject({ response: { code: "WORKSPACE_ACCESS_DENIED" } });
  });

  it("rejects a workspace result assigned to another organization", async () => {
    const { service } = serviceWith(buildMembership(), {
      ...buildWorkspace(),
      organizationId: ids.otherOrganization,
    });
    await expect(
      service.resolve(buildSession(), ids.organization, ids.workspace),
    ).rejects.toMatchObject({ response: { code: "WORKSPACE_ACCESS_DENIED" } });
  });

  it("rejects an inactive workspace", async () => {
    const { service } = serviceWith(
      buildMembership(),
      buildWorkspace(WorkspaceStatus.DISABLED),
    );
    await expect(
      service.resolve(buildSession(), ids.organization, ids.workspace),
    ).rejects.toMatchObject({ response: { code: "WORKSPACE_INACTIVE" } });
  });

  it("pins object selectors to both verified tenant identifiers", () => {
    expect(tenantOwnedWhere(buildTenantScope(), "lead-id")).toEqual({
      id: "lead-id",
      organizationId: ids.organization,
      workspaceId: ids.workspace,
    });
  });
});
