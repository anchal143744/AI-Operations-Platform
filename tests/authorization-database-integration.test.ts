import { randomUUID } from "node:crypto";
import { MembershipRole, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthorizationService } from "../apps/api/src/authorization/authorization.service";
import { Permissions } from "../apps/api/src/authorization/permissions";
import { TenantContextService } from "../apps/api/src/tenancy/tenant-context.service";
import { buildSession } from "./authorization-fixtures";
import { assertDisposableTestDatabaseUrl } from "./disposable-database";

const databaseUrl = process.env.TEST_DATABASE_URL;
const enabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" && Boolean(databaseUrl);

describe.skipIf(!enabled)("PostgreSQL authorization boundaries", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    assertDisposableTestDatabaseUrl(databaseUrl as string);
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("rechecks membership role and rejects cross-tenant or inactive context", async () => {
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        email: `phase22-${suffix}@example.invalid`,
        normalizedEmail: `phase22-${suffix}@example.invalid`,
        name: "Authorization test user",
        passwordHash: "$integration-test-hash$",
        status: "ACTIVE",
        emailVerifiedAt: new Date(),
      },
    });
    const organizationA = await prisma.organization.create({
      data: { name: "Authorization test A", slug: `phase22-a-${suffix}` },
    });
    const organizationB = await prisma.organization.create({
      data: { name: "Authorization test B", slug: `phase22-b-${suffix}` },
    });
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: organizationA.id,
        role: MembershipRole.SALES,
        status: "ACTIVE",
      },
    });
    const workspaceA = await prisma.workspace.create({
      data: { organizationId: organizationA.id, name: "A", slug: "main" },
    });
    const workspaceB = await prisma.workspace.create({
      data: { organizationId: organizationB.id, name: "B", slug: "main" },
    });

    try {
      const tenants = new TenantContextService(prisma as never);
      const permissions = new AuthorizationService();
      const session = buildSession(user.id);

      const sales = await tenants.resolve(
        session,
        organizationA.id,
        workspaceA.id,
      );
      expect(sales.membershipId).toBe(membership.id);
      expect(permissions.can(sales, Permissions.MEMBERSHIP_MANAGE)).toBe(false);

      await prisma.membership.update({
        where: { id: membership.id },
        data: { role: MembershipRole.ADMIN },
      });
      const admin = await tenants.resolve(
        session,
        organizationA.id,
        workspaceA.id,
      );
      expect(permissions.can(admin, Permissions.MEMBERSHIP_MANAGE)).toBe(true);

      await expect(
        tenants.resolve(session, organizationB.id, workspaceB.id),
      ).rejects.toMatchObject({ response: { code: "MEMBERSHIP_REQUIRED" } });
      await expect(
        tenants.resolve(session, organizationA.id, workspaceB.id),
      ).rejects.toMatchObject({
        response: { code: "WORKSPACE_ACCESS_DENIED" },
      });

      await prisma.membership.update({
        where: { id: membership.id },
        data: { status: "SUSPENDED" },
      });
      await expect(
        tenants.resolve(session, organizationA.id, workspaceA.id),
      ).rejects.toMatchObject({ response: { code: "MEMBERSHIP_INACTIVE" } });
      await prisma.membership.update({
        where: { id: membership.id },
        data: { status: "ACTIVE" },
      });

      await prisma.organization.update({
        where: { id: organizationA.id },
        data: { status: "SUSPENDED" },
      });
      await expect(
        tenants.resolve(session, organizationA.id, workspaceA.id),
      ).rejects.toMatchObject({ response: { code: "ORGANIZATION_INACTIVE" } });
      await prisma.organization.update({
        where: { id: organizationA.id },
        data: { status: "ACTIVE" },
      });

      await prisma.workspace.update({
        where: { id: workspaceA.id },
        data: { status: "DISABLED" },
      });
      await expect(
        tenants.resolve(session, organizationA.id, workspaceA.id),
      ).rejects.toMatchObject({ response: { code: "WORKSPACE_INACTIVE" } });
    } finally {
      await prisma.workspace.delete({ where: { id: workspaceB.id } });
      await prisma.workspace.delete({ where: { id: workspaceA.id } });
      await prisma.membership.delete({ where: { id: membership.id } });
      await prisma.organization.delete({ where: { id: organizationB.id } });
      await prisma.organization.delete({ where: { id: organizationA.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
