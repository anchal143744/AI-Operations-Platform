import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDisposableTestDatabaseUrl } from "./disposable-database";

const databaseUrl = process.env.TEST_DATABASE_URL;
const integrationEnabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" && Boolean(databaseUrl);

describe.skipIf(!integrationEnabled)("PostgreSQL tenant constraints", () => {
  let prisma: PrismaClient;

  beforeAll(() => {
    assertDisposableTestDatabaseUrl(databaseUrl as string);

    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("enforces membership, slug, and cross-tenant ownership constraints", async () => {
    const suffix = randomUUID();
    const organization = await prisma.organization.create({
      data: { name: "Phase 20 test organization", slug: `phase20-${suffix}` },
    });
    const secondOrganization = await prisma.organization.create({
      data: {
        name: "Phase 20 second test organization",
        slug: `phase20-b-${suffix}`,
      },
    });
    const user = await prisma.user.create({
      data: {
        email: `phase20-${suffix}@example.invalid`,
        normalizedEmail: `phase20-${suffix}@example.invalid`,
        name: "Phase 20 test user",
        passwordHash: "$integration-test-hash$",
      },
    });
    const membership = await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: "OWNER",
        status: "ACTIVE",
      },
    });
    const workspace = await prisma.workspace.create({
      data: {
        organizationId: organization.id,
        name: "Phase 20 test workspace",
        slug: "operations",
      },
    });
    const secondWorkspace = await prisma.workspace.create({
      data: {
        organizationId: secondOrganization.id,
        name: "Phase 20 second workspace",
        slug: "operations",
      },
    });
    const lead = await prisma.lead.create({
      data: {
        organizationId: organization.id,
        workspaceId: workspace.id,
        name: "Constraint test lead",
      },
    });

    try {
      const loaded = await prisma.organization.findUniqueOrThrow({
        where: { id: organization.id },
        include: { memberships: true, workspaces: true },
      });
      expect(loaded.memberships[0]?.id).toBe(membership.id);
      expect(loaded.workspaces[0]?.id).toBe(workspace.id);

      await expect(
        prisma.organization.create({
          data: { name: "Duplicate slug", slug: organization.slug },
        }),
      ).rejects.toMatchObject({ code: "P2002" });

      await expect(
        prisma.membership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: "VIEWER",
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });

      await expect(
        prisma.workspace.create({
          data: {
            organizationId: organization.id,
            name: "Duplicate slug",
            slug: workspace.slug,
          },
        }),
      ).rejects.toMatchObject({ code: "P2002" });

      await expect(
        prisma.conversation.create({
          data: {
            organizationId: secondOrganization.id,
            workspaceId: secondWorkspace.id,
            leadId: lead.id,
            participantName: "Cross tenant",
            channel: "WEBSITE",
          },
        }),
      ).rejects.toMatchObject({ code: "P2003" });
    } finally {
      await prisma.lead.delete({ where: { id: lead.id } });
      await prisma.workspace.delete({ where: { id: secondWorkspace.id } });
      await prisma.workspace.delete({ where: { id: workspace.id } });
      await prisma.membership.delete({ where: { id: membership.id } });
      await prisma.organization.delete({
        where: { id: secondOrganization.id },
      });
      await prisma.organization.delete({ where: { id: organization.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  });
});
