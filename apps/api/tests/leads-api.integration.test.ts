import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import {
  BadRequestException,
  ValidationPipe,
  type INestApplication,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { PrismaClient, type MembershipRole } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthConfig } from "../src/auth/auth.config";
import { AuthTokenService } from "../src/auth/token.service";
import { assertDisposableTestDatabaseUrl } from "../../../tests/disposable-database";

const databaseUrl = process.env.TEST_DATABASE_URL;
const enabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" && Boolean(databaseUrl);
const roles = ["OWNER", "ADMIN", "MANAGER", "SALES", "VIEWER"] as const;
const requireBuiltApi = createRequire(import.meta.url);
type Role = (typeof roles)[number] | "FOREIGN";

describe.skipIf(!enabled)("PostgreSQL Leads HTTP authorization", () => {
  let prisma: PrismaClient;
  let app: INestApplication;
  let baseUrl: string;
  let organizationA: string;
  let organizationB: string;
  let workspaceA: string;
  let workspaceA2: string;
  let workspaceB: string;
  let leadA: string;
  let leadA2: string;
  let leadB: string;
  const sessions = {} as Record<Role, string>;
  const membershipIds = {} as Record<Role, string>;
  const userIds = {} as Record<Role, string>;
  const previous = {
    databaseUrl: process.env.DATABASE_URL,
    appOrigin: process.env.APP_ORIGIN,
    pepper: process.env.AUTH_TOKEN_PEPPER,
  };

  function restore(name: string, value: string | undefined) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }

  function request(
    path: string,
    options: {
      role?: Role;
      method?: string;
      body?: Record<string, unknown>;
      organizationId?: string;
      workspaceId?: string;
      headers?: Record<string, string>;
    } = {},
  ) {
    const headers: Record<string, string> = {
      "X-AOP-Organization-Id": options.organizationId ?? organizationA,
      "X-AOP-Workspace-Id": options.workspaceId ?? workspaceA,
      ...(options.role
        ? { Cookie: `aop_session=${sessions[options.role]}` }
        : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...((options.method ?? "GET") !== "GET"
        ? { Origin: "http://localhost:3000" }
        : {}),
      ...options.headers,
    };
    return fetch(`${baseUrl}${path}`, {
      method: options.method ?? "GET",
      headers,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
  }

  beforeAll(async () => {
    assertDisposableTestDatabaseUrl(databaseUrl as string);
    process.env.DATABASE_URL = databaseUrl;
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.AUTH_TOKEN_PEPPER =
      "phase23-disposable-test-pepper-at-least-32-chars";
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const config = new AuthConfig(process.env);
    const tokens = new AuthTokenService(config);
    const suffix = randomUUID();

    const orgA = await prisma.organization.create({
      data: { name: "Phase 23 A", slug: `phase23-a-${suffix}` },
    });
    const orgB = await prisma.organization.create({
      data: { name: "Phase 23 B", slug: `phase23-b-${suffix}` },
    });
    organizationA = orgA.id;
    organizationB = orgB.id;
    workspaceA = (
      await prisma.workspace.create({
        data: { organizationId: organizationA, name: "A1", slug: "a1" },
      })
    ).id;
    workspaceA2 = (
      await prisma.workspace.create({
        data: { organizationId: organizationA, name: "A2", slug: "a2" },
      })
    ).id;
    workspaceB = (
      await prisma.workspace.create({
        data: { organizationId: organizationB, name: "B1", slug: "b1" },
      })
    ).id;

    for (const role of [...roles, "FOREIGN"] as const) {
      const user = await prisma.user.create({
        data: {
          email: `phase23-${role.toLowerCase()}-${suffix}@example.invalid`,
          normalizedEmail: `phase23-${role.toLowerCase()}-${suffix}@example.invalid`,
          name: `Phase 23 ${role}`,
          passwordHash: "$test-only-non-login-hash$",
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
        },
      });
      userIds[role] = user.id;
      const membership = await prisma.membership.create({
        data: {
          userId: user.id,
          organizationId: role === "FOREIGN" ? organizationB : organizationA,
          role: (role === "FOREIGN" ? "OWNER" : role) as MembershipRole,
          status: "ACTIVE",
        },
      });
      membershipIds[role] = membership.id;
      const issued = tokens.issueOpaqueToken();
      sessions[role] = issued.rawToken;
      await prisma.session.create({
        data: {
          userId: user.id,
          tokenHash: issued.tokenHash,
          expiresAt: new Date(Date.now() + 60_000),
        },
      });
    }

    leadA = (
      await prisma.lead.create({
        data: {
          organizationId: organizationA,
          workspaceId: workspaceA,
          name: "A1 only",
          createdByMembershipId: membershipIds.OWNER,
        },
      })
    ).id;
    leadA2 = (
      await prisma.lead.create({
        data: {
          organizationId: organizationA,
          workspaceId: workspaceA2,
          name: "A2 only",
        },
      })
    ).id;
    leadB = (
      await prisma.lead.create({
        data: {
          organizationId: organizationB,
          workspaceId: workspaceB,
          name: "B only",
        },
      })
    ).id;

    // Vitest's TS transform does not emit Nest constructor metadata. Exercise
    // the compiled API instead of silently mocking dependency injection.
    const { AppModule } = requireBuiltApi("../dist/app.module.js") as {
      AppModule: new (...args: never[]) => unknown;
    };
    app = await NestFactory.create(AppModule, {
      logger: false,
      abortOnError: false,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        exceptionFactory: () =>
          new BadRequestException({
            statusCode: 400,
            code: "VALIDATION_FAILED",
            message: "Check the submitted fields and try again.",
          }),
      }),
    );
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${address.port}`;
  }, 30_000);

  afterAll(async () => {
    await app?.close();
    // Lead mutations now produce append-only audit history. The suite is
    // restricted to a disposable test database and intentionally leaves it
    // for whole-database disposal instead of weakening audit immutability.
    await prisma?.$disconnect();
    restore("DATABASE_URL", previous.databaseUrl);
    restore("APP_ORIGIN", previous.appOrigin);
    restore("AUTH_TOKEN_PEPPER", previous.pepper);
  });

  it("rejects unauthenticated methods and missing tenant context", async () => {
    expect((await request("/leads")).status).toBe(401);
    expect(
      (await request("/leads", { method: "POST", body: { name: "X" } })).status,
    ).toBe(401);
    expect(
      (
        await request(`/leads/${leadA}`, {
          method: "PATCH",
          body: { name: "X" },
        })
      ).status,
    ).toBe(401);
    const response = await request("/leads", {
      role: "OWNER",
      headers: { "X-AOP-Workspace-Id": "" },
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      code: "TENANT_CONTEXT_REQUIRED",
    });
  });

  it("uses current role permissions across all five roles", async () => {
    for (const role of roles) {
      expect((await request(`/leads/${leadA}`, { role })).status).toBe(200);
    }
    for (const role of ["OWNER", "ADMIN", "MANAGER", "SALES"] as const) {
      const created = await request("/leads", {
        role,
        method: "POST",
        body: { name: `${role} lead` },
      });
      expect(created.status).toBe(201);
      const record = (await created.json()) as { id: string };
      expect(
        (
          await request(`/leads/${record.id}`, {
            role,
            method: "PATCH",
            body: { status: "CONTACTED" },
          })
        ).status,
      ).toBe(200);
    }
    const denied = await request("/leads", {
      role: "VIEWER",
      method: "POST",
      body: { name: "Denied" },
    });
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ code: "PERMISSION_DENIED" });
    expect(
      (
        await request(`/leads/${leadA}`, {
          role: "VIEWER",
          method: "PATCH",
          body: { name: "Denied" },
        })
      ).status,
    ).toBe(403);
  });

  it("rejects foreign membership, workspace, and object IDs without disclosing leads", async () => {
    const foreignOrganization = await request("/leads", {
      role: "OWNER",
      organizationId: organizationB,
      workspaceId: workspaceB,
    });
    expect(foreignOrganization.status).toBe(403);
    expect(await foreignOrganization.json()).toMatchObject({
      code: "MEMBERSHIP_REQUIRED",
    });
    expect(
      (
        await request("/leads", {
          role: "OWNER",
          workspaceId: workspaceB,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await request("/leads", {
          role: "FOREIGN",
          organizationId: organizationA,
          workspaceId: workspaceA,
        })
      ).status,
    ).toBe(403);
    for (const id of [leadA2, leadB]) {
      const detail = await request(`/leads/${id}`, { role: "OWNER" });
      expect(detail.status).toBe(404);
      expect(await detail.json()).toMatchObject({ code: "LEAD_NOT_FOUND" });
      expect(
        (
          await request(`/leads/${id}`, {
            role: "OWNER",
            method: "PATCH",
            body: { name: "Cross-tenant edit" },
          })
        ).status,
      ).toBe(404);
    }
    expect(
      (await prisma.lead.findUniqueOrThrow({ where: { id: leadB } })).name,
    ).toBe("B only");
  });

  it("allows same-organization selection but isolates workspace records", async () => {
    const response = await request("/leads", {
      role: "OWNER",
      workspaceId: workspaceA2,
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { items: { id: string }[] };
    expect(body.items.map((item) => item.id)).toContain(leadA2);
    expect(body.items.map((item) => item.id)).not.toContain(leadA);
    expect(body.items.map((item) => item.id)).not.toContain(leadB);
  });

  it("rejects forged actor, membership, role, user, and tenant claims", async () => {
    for (const [key, value] of Object.entries({
      organizationId: organizationB,
      workspaceId: workspaceB,
      membershipId: membershipIds.FOREIGN,
      role: "OWNER",
      userId: userIds.FOREIGN,
      actorId: userIds.FOREIGN,
    })) {
      const response = await request("/leads", {
        role: "SALES",
        method: "POST",
        body: { name: "Forged", [key]: value },
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        code: "TENANT_CONTEXT_CLAIM_REJECTED",
      });
    }
    const query = await request(`/leads?role=OWNER`, { role: "VIEWER" });
    expect(query.status).toBe(400);
    for (const header of [
      "X-Membership-Id",
      "X-User-Id",
      "X-Role",
      "X-Actor-Id",
    ]) {
      const response = await request("/leads", {
        role: "VIEWER",
        headers: { [header]: membershipIds.FOREIGN },
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        code: "TENANT_CONTEXT_CLAIM_REJECTED",
      });
    }
  });

  it("derives creator and ownership from verified context, not input", async () => {
    const response = await request("/leads", {
      role: "SALES",
      method: "POST",
      body: {
        name: "Real test lead",
        company: "Disposable fixture",
        email: "TEST@EXAMPLE.INVALID",
        source: "MANUAL",
      },
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { id: string; email: string };
    const persisted = await prisma.lead.findUniqueOrThrow({
      where: { id: body.id },
    });
    expect(persisted.organizationId).toBe(organizationA);
    expect(persisted.workspaceId).toBe(workspaceA);
    expect(persisted.createdByMembershipId).toBe(membershipIds.SALES);
    expect(body.email).toBe("test@example.invalid");
    expect(JSON.stringify(body)).not.toContain("createdByMembershipId");
  });

  it("validates DTOs, UUIDs, pagination, search, status, and sort", async () => {
    for (const body of [
      { name: "" },
      { name: "X", email: "bad-email" },
      { name: "X", priority: "CRITICAL" },
      { name: "X", status: "NEW" },
      { name: "X", company: "a".repeat(161) },
    ]) {
      expect(
        (await request("/leads", { role: "SALES", method: "POST", body }))
          .status,
      ).toBe(400);
    }
    expect((await request("/leads/not-a-uuid", { role: "OWNER" })).status).toBe(
      400,
    );
    for (const query of [
      "page=0",
      "limit=101",
      "sort=name",
      "status=UNKNOWN",
      `search=${"x".repeat(161)}`,
    ]) {
      expect((await request(`/leads?${query}`, { role: "OWNER" })).status).toBe(
        400,
      );
    }
    const list = await request(
      "/leads?page=1&limit=1&search=A1&status=NEW&sort=OLDEST",
      { role: "OWNER" },
    );
    expect(list.status).toBe(200);
    const result = (await list.json()) as {
      items: { id: string }[];
      page: number;
      limit: number;
      total: number;
    };
    expect(result.items.map((item) => item.id)).toContain(leadA);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(1);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("rejects inactive membership, organization, and workspace", async () => {
    await prisma.membership.update({
      where: { id: membershipIds.VIEWER },
      data: { status: "SUSPENDED" },
    });
    expect((await request("/leads", { role: "VIEWER" })).status).toBe(403);
    await prisma.membership.update({
      where: { id: membershipIds.VIEWER },
      data: { status: "ACTIVE" },
    });
    await prisma.organization.update({
      where: { id: organizationA },
      data: { status: "SUSPENDED" },
    });
    expect((await request("/leads", { role: "VIEWER" })).status).toBe(403);
    await prisma.organization.update({
      where: { id: organizationA },
      data: { status: "ACTIVE" },
    });
    await prisma.workspace.update({
      where: { id: workspaceA },
      data: { status: "DISABLED" },
    });
    expect((await request("/leads", { role: "VIEWER" })).status).toBe(403);
    await prisma.workspace.update({
      where: { id: workspaceA },
      data: { status: "ACTIVE" },
    });
  });

  it("rechecks database role changes and rejects revoked sessions", async () => {
    await prisma.membership.update({
      where: { id: membershipIds.SALES },
      data: { role: "VIEWER" },
    });
    expect(
      (
        await request("/leads", {
          role: "SALES",
          method: "POST",
          body: { name: "Role change denied" },
        })
      ).status,
    ).toBe(403);
    await prisma.membership.update({
      where: { id: membershipIds.SALES },
      data: { role: "SALES" },
    });
    await prisma.session.updateMany({
      where: { userId: userIds.VIEWER },
      data: { revokedAt: new Date() },
    });
    expect((await request("/leads", { role: "VIEWER" })).status).toBe(401);
  });
});
