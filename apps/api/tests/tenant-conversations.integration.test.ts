import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import {
  BadRequestException,
  ValidationPipe,
  type INestApplication,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  CommunicationProvider,
  ConversationChannel,
  PrismaClient,
  type MembershipRole,
} from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuthConfig } from "../src/auth/auth.config";
import { AuthTokenService } from "../src/auth/token.service";
import { assertDisposableTestDatabaseUrl } from "../../../tests/disposable-database";

const databaseUrl = process.env.TEST_DATABASE_URL;
const enabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" && Boolean(databaseUrl);
const requireBuiltApi = createRequire(import.meta.url);

describe.skipIf(!enabled)(
  "PostgreSQL tenant bootstrap and Conversations API",
  () => {
    let prisma: PrismaClient;
    let app: INestApplication;
    let baseUrl: string;
    let organizationA: string;
    let organizationB: string;
    let workspaceA: string;
    let workspaceB: string;
    let leadA: string;
    let leadB: string;
    let conversationA: string;
    let providerMessageA: string;
    const sessions: Record<string, string> = {};
    const users: Record<string, string> = {};
    const memberships: Record<string, string> = {};
    const createdBootstrapOrganizations: string[] = [];
    const suffix = randomUUID();
    const previous = {
      databaseUrl: process.env.DATABASE_URL,
      appOrigin: process.env.APP_ORIGIN,
      pepper: process.env.AUTH_TOKEN_PEPPER,
    };

    function request(
      path: string,
      options: {
        actor?: string;
        method?: string;
        body?: Record<string, unknown>;
        organizationId?: string;
        workspaceId?: string;
        headers?: Record<string, string>;
      } = {},
    ) {
      const method = options.method ?? "GET";
      return fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          ...(options.actor
            ? { Cookie: `aop_session=${sessions[options.actor]}` }
            : {}),
          ...(options.organizationId
            ? { "X-AOP-Organization-Id": options.organizationId }
            : {}),
          ...(options.workspaceId
            ? { "X-AOP-Workspace-Id": options.workspaceId }
            : {}),
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(method !== "GET" ? { Origin: "http://localhost:3000" } : {}),
          ...options.headers,
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      });
    }

    beforeAll(async () => {
      assertDisposableTestDatabaseUrl(databaseUrl as string);
      process.env.DATABASE_URL = databaseUrl;
      process.env.APP_ORIGIN = "http://localhost:3000";
      process.env.AUTH_TOKEN_PEPPER =
        "phase24-25-disposable-pepper-at-least-32-chars";
      prisma = new PrismaClient({ datasourceUrl: databaseUrl });
      const tokens = new AuthTokenService(new AuthConfig(process.env));

      const orgA = await prisma.organization.create({
        data: { name: "Tenant A", slug: `p25-a-${suffix}` },
      });
      const orgB = await prisma.organization.create({
        data: { name: "Tenant B", slug: `p25-b-${suffix}` },
      });
      organizationA = orgA.id;
      organizationB = orgB.id;
      workspaceA = (
        await prisma.workspace.create({
          data: { organizationId: orgA.id, name: "A", slug: "main" },
        })
      ).id;
      workspaceB = (
        await prisma.workspace.create({
          data: { organizationId: orgB.id, name: "B", slug: "main" },
        })
      ).id;

      for (const [actor, role, organizationId] of [
        ["owner", "OWNER", organizationA],
        ["sales", "SALES", organizationA],
        ["viewer", "VIEWER", organizationA],
        ["foreign", "OWNER", organizationB],
        ["bootstrap", null, null],
        ["rollback", null, null],
      ] as const) {
        const user = await prisma.user.create({
          data: {
            email: `${actor}-${suffix}@example.invalid`,
            normalizedEmail: `${actor}-${suffix}@example.invalid`,
            name: actor,
            passwordHash: "$test-only$",
            status: "ACTIVE",
            emailVerifiedAt: new Date(),
          },
        });
        users[actor] = user.id;
        if (role && organizationId) {
          memberships[actor] = (
            await prisma.membership.create({
              data: {
                userId: user.id,
                organizationId,
                role: role as MembershipRole,
                status: "ACTIVE",
              },
            })
          ).id;
        }
        const token = tokens.issueOpaqueToken();
        sessions[actor] = token.rawToken;
        await prisma.session.create({
          data: {
            userId: user.id,
            tokenHash: token.tokenHash,
            expiresAt: new Date(Date.now() + 600_000),
          },
        });
      }

      leadA = (
        await prisma.lead.create({
          data: {
            organizationId: organizationA,
            workspaceId: workspaceA,
            name: "Lead A",
            createdByMembershipId: memberships.owner,
          },
        })
      ).id;
      leadB = (
        await prisma.lead.create({
          data: {
            organizationId: organizationB,
            workspaceId: workspaceB,
            name: "Lead B",
            createdByMembershipId: memberships.foreign,
          },
        })
      ).id;

      const { AppModule } = requireBuiltApi("../dist/app.module.js") as {
        AppModule: new (...args: never[]) => unknown;
      };
      app = await NestFactory.create(AppModule, { logger: false });
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
      if (prisma) {
        // Audit rows are database-enforced append-only. This suite therefore
        // runs only against a disposable test database and removes no history.
        await prisma.$disconnect();
      }
      if (app) await app.close();
      for (const [name, value] of Object.entries(previous)) {
        const key =
          name === "databaseUrl"
            ? "DATABASE_URL"
            : name === "appOrigin"
              ? "APP_ORIGIN"
              : "AUTH_TOKEN_PEPPER";
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }, 30_000);

    it("atomically bootstraps an organization, OWNER membership, and first workspace", async () => {
      const slug = `boot-${suffix}`;
      const response = await request("/organizations", {
        actor: "bootstrap",
        method: "POST",
        body: {
          name: "Bootstrap Co",
          slug,
          workspaceName: "Operations",
          workspaceSlug: "operations",
          userId: users.foreign,
          role: "OWNER",
        },
      });
      expect(response.status).toBe(400);
      const accepted = await request("/organizations", {
        actor: "bootstrap",
        method: "POST",
        body: {
          name: "Bootstrap Co",
          slug,
          workspaceName: "Operations",
          workspaceSlug: "operations",
        },
      });
      expect(accepted.status).toBe(201);
      const body = (await accepted.json()) as {
        organization: { id: string; role: string };
        workspace: { id: string };
        membershipId: string;
      };
      createdBootstrapOrganizations.push(body.organization.id);
      expect(body.organization.role).toBe("OWNER");
      const membership = await prisma.membership.findUnique({
        where: { id: body.membershipId },
      });
      expect(membership).toMatchObject({
        userId: users.bootstrap,
        role: "OWNER",
        status: "ACTIVE",
      });
      expect(
        await prisma.workspace.findUnique({ where: { id: body.workspace.id } }),
      ).toMatchObject({
        organizationId: body.organization.id,
        status: "ACTIVE",
      });
    });

    it("rolls back organization and membership when workspace creation fails", async () => {
      const slug = `rollback-${suffix}`;
      await prisma.$executeRaw`CREATE OR REPLACE FUNCTION phase25_reject_workspace() RETURNS trigger AS $$ BEGIN IF NEW.slug = 'force-rollback' THEN RAISE EXCEPTION 'forced test rollback'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql`;
      await prisma.$executeRaw`CREATE TRIGGER phase25_reject_workspace BEFORE INSERT ON workspaces FOR EACH ROW EXECUTE FUNCTION phase25_reject_workspace()`;
      try {
        const response = await request("/organizations", {
          actor: "rollback",
          method: "POST",
          body: {
            name: "Rollback Co",
            slug,
            workspaceName: "Fail",
            workspaceSlug: "force-rollback",
          },
        });
        expect(response.status).toBe(500);
        expect(
          await prisma.organization.findUnique({ where: { slug } }),
        ).toBeNull();
        expect(
          await prisma.membership.count({ where: { userId: users.rollback } }),
        ).toBe(0);
      } finally {
        await prisma.$executeRaw`DROP TRIGGER IF EXISTS phase25_reject_workspace ON workspaces`;
        await prisma.$executeRaw`DROP FUNCTION IF EXISTS phase25_reject_workspace()`;
      }
    });

    it("lists only active memberships and protects workspace creation", async () => {
      const own = await request("/organizations", { actor: "owner" });
      expect(own.status).toBe(200);
      expect(
        ((await own.json()) as Array<{ id: string }>).map((item) => item.id),
      ).toEqual([organizationA]);
      expect(
        (
          await request(`/organizations/${organizationB}/workspaces`, {
            actor: "owner",
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(`/organizations/${organizationA}/workspaces`, {
            actor: "sales",
            method: "POST",
            body: { name: "Blocked", slug: "blocked" },
          })
        ).status,
      ).toBe(403);
      const created = await request(
        `/organizations/${organizationA}/workspaces`,
        {
          actor: "owner",
          method: "POST",
          body: { name: "Second", slug: `second-${suffix}` },
        },
      );
      expect(created.status).toBe(201);
    });

    it("persists only a verified active workspace pair and clears stale preferences", async () => {
      const selected = await request("/organizations/active-workspace", {
        actor: "owner",
        method: "PATCH",
        body: { organizationId: organizationA, workspaceId: workspaceA },
      });
      expect(selected.status).toBe(200);
      expect((await selected.json()) as object).toMatchObject({
        activeWorkspace: {
          organizationId: organizationA,
          workspaceId: workspaceA,
        },
      });
      expect(
        await prisma.session.findFirst({ where: { userId: users.owner } }),
      ).toMatchObject({
        activeOrganizationId: organizationA,
        activeWorkspaceId: workspaceA,
      });
      expect(
        (
          await request("/organizations/active-workspace", {
            actor: "owner",
            method: "PATCH",
            body: { organizationId: organizationA, workspaceId: workspaceB },
          })
        ).status,
      ).toBe(403);
      await prisma.workspace.update({
        where: { id: workspaceA },
        data: { status: "DISABLED" },
      });
      const refreshed = await request("/auth/session", { actor: "owner" });
      expect(refreshed.status).toBe(200);
      expect((await refreshed.json()) as object).toMatchObject({
        activeWorkspace: null,
      });
      expect(
        await prisma.session.findFirst({ where: { userId: users.owner } }),
      ).toMatchObject({ activeOrganizationId: null, activeWorkspaceId: null });
      await prisma.workspace.update({
        where: { id: workspaceA },
        data: { status: "ACTIVE" },
      });
    });

    it("reads append-only activity only inside the verified workspace", async () => {
      await request("/organizations/active-workspace", {
        actor: "owner",
        method: "PATCH",
        body: { organizationId: organizationA, workspaceId: workspaceA },
      });
      const list = await request("/activity?limit=10&sort=NEWEST", {
        actor: "owner",
        organizationId: organizationA,
        workspaceId: workspaceA,
      });
      expect(list.status).toBe(200);
      const body = (await list.json()) as {
        items: Array<{ eventType: string }>;
      };
      expect(
        body.items.some((item) => item.eventType === "WORKSPACE_SELECTED"),
      ).toBe(true);
      expect(
        (
          await request("/activity", {
            actor: "foreign",
            organizationId: organizationB,
            workspaceId: workspaceB,
          })
        ).status,
      ).toBe(200);
      expect(
        await prisma.activityEvent
          .updateMany({
            where: { organizationId: organizationA },
            data: { summary: "tampered" },
          })
          .catch(() => null),
      ).toBeNull();
      expect(
        await prisma.activityEvent
          .deleteMany({
            where: { organizationId: organizationA },
          })
          .catch(() => null),
      ).toBeNull();
    });

    it("creates tenant-derived conversations and rejects forged authority or cross-tenant leads", async () => {
      const forged = await request("/conversations", {
        actor: "sales",
        method: "POST",
        organizationId: organizationA,
        workspaceId: workspaceA,
        body: {
          participantName: "Forged",
          channel: "WEBSITE",
          organizationId: organizationB,
          role: "OWNER",
        },
      });
      expect(forged.status).toBe(400);
      expect(
        (
          await request("/conversations", {
            actor: "sales",
            method: "POST",
            organizationId: organizationA,
            workspaceId: workspaceA,
            body: {
              participantName: "Cross",
              channel: "WEBSITE",
              leadId: leadB,
            },
          })
        ).status,
      ).toBe(404);
      const created = await request("/conversations", {
        actor: "sales",
        method: "POST",
        organizationId: organizationA,
        workspaceId: workspaceA,
        body: {
          participantName: "Customer A",
          participantCompany: "Company A",
          subject: "Enquiry",
          channel: "WEBSITE",
          leadId: leadA,
        },
      });
      expect(created.status).toBe(201);
      const body = (await created.json()) as { id: string };
      conversationA = body.id;
      expect(
        await prisma.conversation.findUnique({ where: { id: body.id } }),
      ).toMatchObject({
        organizationId: organizationA,
        workspaceId: workspaceA,
        createdByMembershipId: memberships.sales,
        leadId: leadA,
      });
    });

    it("enforces read/write permissions and tenant-scoped detail", async () => {
      expect(
        (
          await request("/conversations", {
            organizationId: organizationA,
            workspaceId: workspaceA,
          })
        ).status,
      ).toBe(401);
      expect(
        (
          await request("/conversations", {
            actor: "viewer",
            organizationId: organizationA,
            workspaceId: workspaceA,
          })
        ).status,
      ).toBe(200);
      expect(
        (
          await request("/conversations", {
            actor: "viewer",
            method: "POST",
            organizationId: organizationA,
            workspaceId: workspaceA,
            body: { participantName: "Denied", channel: "EMAIL" },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(`/conversations/${conversationA}`, {
            actor: "foreign",
            organizationId: organizationB,
            workspaceId: workspaceB,
          })
        ).status,
      ).toBe(404);
      expect(
        (
          await request(`/conversations/${conversationA}`, {
            actor: "owner",
            organizationId: organizationA,
            workspaceId: workspaceB,
          })
        ).status,
      ).toBe(403);
    });

    it("persists internal messages with server-derived sender identity", async () => {
      expect(
        (
          await request(`/conversations/${conversationA}/messages`, {
            actor: "viewer",
            method: "POST",
            organizationId: organizationA,
            workspaceId: workspaceA,
            body: { content: "Denied" },
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await request(`/conversations/${conversationA}/messages`, {
            actor: "sales",
            method: "POST",
            organizationId: organizationA,
            workspaceId: workspaceA,
            body: {
              content: "",
              senderType: "AI",
              senderMembershipId: memberships.foreign,
            },
          })
        ).status,
      ).toBe(400);
      const sent = await request(`/conversations/${conversationA}/messages`, {
        actor: "sales",
        method: "POST",
        organizationId: organizationA,
        workspaceId: workspaceA,
        body: { content: "Internal response record" },
      });
      expect(sent.status).toBe(201);
      const body = (await sent.json()) as {
        id: string;
        direction: string;
        senderType: string;
      };
      expect(body).toMatchObject({
        direction: "OUTBOUND",
        senderType: "HUMAN",
        status: "DRAFT",
      });
      expect(
        await prisma.message.findUnique({ where: { id: body.id } }),
      ).toMatchObject({
        senderMembershipId: memberships.sales,
        organizationId: organizationA,
        workspaceId: workspaceA,
      });
    });

    it("submits through the tenant provider configuration idempotently without fabricating delivery", async () => {
      await prisma.providerConfiguration.create({
        data: {
          organizationId: organizationA,
          workspaceId: workspaceA,
          channel: "WEBSITE",
          provider: "TEST",
          status: "ACTIVE",
          publicReference: `test-a-${suffix}`,
        },
      });
      await prisma.providerConfiguration.create({
        data: {
          organizationId: organizationB,
          workspaceId: workspaceB,
          channel: "WEBSITE",
          provider: "TEST",
          status: "ACTIVE",
          publicReference: `test-b-${suffix}`,
        },
      });
      const idempotencyKey = randomUUID();
      const first = await request(
        `/conversations/${conversationA}/deliveries`,
        {
          actor: "sales",
          method: "POST",
          organizationId: organizationA,
          workspaceId: workspaceA,
          body: { content: "Provider-bound test message", idempotencyKey },
        },
      );
      expect(first.status).toBe(202);
      const message = (await first.json()) as { id: string; status: string };
      expect(message.status).toBe("QUEUED");
      expect(
        await prisma.outboxEvent.findFirst({
          where: {
            organizationId: organizationA,
            workspaceId: workspaceA,
            messageId: message.id,
          },
        }),
      ).toMatchObject({ status: "PENDING", attempts: 0, maxAttempts: 3 });
      expect(
        await prisma.activityEvent.count({
          where: {
            organizationId: organizationA,
            workspaceId: workspaceA,
            resourceId: message.id,
            eventType: "MESSAGE_QUEUED",
          },
        }),
      ).toBe(1);
      const duplicate = await request(
        `/conversations/${conversationA}/deliveries`,
        {
          actor: "sales",
          method: "POST",
          organizationId: organizationA,
          workspaceId: workspaceA,
          body: { content: "Provider-bound test message", idempotencyKey },
        },
      );
      expect(duplicate.status).toBe(202);
      expect(((await duplicate.json()) as { id: string }).id).toBe(message.id);
      const conflicting = await request(
        `/conversations/${conversationA}/deliveries`,
        {
          actor: "sales",
          method: "POST",
          organizationId: organizationA,
          workspaceId: workspaceA,
          body: { content: "A different message", idempotencyKey },
        },
      );
      expect(conflicting.status).toBe(409);
      expect(await conflicting.json()).toMatchObject({
        code: "DUPLICATE_IDEMPOTENCY_KEY",
      });
      expect(
        await prisma.message.count({
          where: {
            organizationId: organizationA,
            workspaceId: workspaceA,
            idempotencyKey,
          },
        }),
      ).toBe(1);
      expect(
        await prisma.activityEvent.count({
          where: {
            organizationId: organizationA,
            workspaceId: workspaceA,
            resourceId: message.id,
            eventType: "MESSAGE_DELIVERED",
          },
        }),
      ).toBe(0);
      const { OutboxWorkerService } = requireBuiltApi(
        "../dist/outbox/outbox-worker.service.js",
      ) as { OutboxWorkerService: new (...args: never[]) => unknown };
      const worker = app.get(OutboxWorkerService) as {
        processNext(
          now?: Date,
        ): Promise<{ processed: boolean; status?: string }>;
      };
      expect(await worker.processNext()).toMatchObject({
        processed: true,
        status: "COMPLETED",
      });
      const delivered = await prisma.message.findUniqueOrThrow({
        where: { id: message.id },
      });
      expect(delivered.status).toBe("PROVIDER_ACCEPTED");
      providerMessageA = delivered.providerMessageId!;
      expect(
        await prisma.outboxEvent.findFirst({
          where: { messageId: message.id },
        }),
      ).toMatchObject({ status: "COMPLETED", attempts: 1 });
      expect(
        (
          await request(`/conversations/${conversationA}/deliveries`, {
            actor: "foreign",
            method: "POST",
            organizationId: organizationB,
            workspaceId: workspaceB,
            body: { content: "Cross tenant", idempotencyKey: randomUUID() },
          })
        ).status,
      ).toBe(404);
    });

    it("verifies and deduplicates provider webhooks without crossing tenant scope", async () => {
      const { ProviderWebhookService } = requireBuiltApi(
        "../dist/communication/provider-webhook.service.js",
      ) as { ProviderWebhookService: new (...args: never[]) => unknown };
      const webhooks = app.get(ProviderWebhookService) as {
        ingest(input: object): Promise<{ duplicate: boolean }>;
      };
      const payload = {
        eventId: `delivered-${suffix}`,
        providerMessageId: providerMessageA,
        type: "MESSAGE_DELIVERED",
      };
      await expect(
        webhooks.ingest({
          provider: CommunicationProvider.TEST,
          channel: ConversationChannel.WEBSITE,
          publicReference: `test-a-${suffix}`,
          payload,
        }),
      ).rejects.toMatchObject({ code: "WEBHOOK_VERIFICATION_FAILED" });
      expect(
        await webhooks.ingest({
          provider: CommunicationProvider.TEST,
          channel: ConversationChannel.WEBSITE,
          publicReference: `test-a-${suffix}`,
          signature: "test-only-valid",
          payload,
        }),
      ).toMatchObject({ duplicate: false });
      expect(
        await webhooks.ingest({
          provider: CommunicationProvider.TEST,
          channel: ConversationChannel.WEBSITE,
          publicReference: `test-a-${suffix}`,
          signature: "test-only-valid",
          payload,
        }),
      ).toMatchObject({ duplicate: true });
      expect(
        await prisma.providerWebhookEvent.count({
          where: { providerEventId: payload.eventId },
        }),
      ).toBe(1);
      expect(
        await prisma.message.findFirst({
          where: {
            organizationId: organizationA,
            workspaceId: workspaceA,
            providerMessageId: providerMessageA,
          },
        }),
      ).toMatchObject({ status: "DELIVERED" });

      await webhooks.ingest({
        provider: CommunicationProvider.TEST,
        channel: ConversationChannel.WEBSITE,
        publicReference: `test-b-${suffix}`,
        signature: "test-only-valid",
        payload: { ...payload, eventId: `foreign-${suffix}` },
      });
      expect(
        await prisma.message.count({
          where: {
            organizationId: organizationB,
            workspaceId: workspaceB,
            providerMessageId: providerMessageA,
          },
        }),
      ).toBe(0);
    });

    it("fails an exhausted stale claim without a fourth provider attempt", async () => {
      const key = randomUUID();
      const message = await prisma.message.create({
        data: {
          organizationId: organizationA,
          workspaceId: workspaceA,
          conversationId: conversationA,
          direction: "OUTBOUND",
          senderType: "HUMAN",
          content: "Disposable exhausted delivery",
          channel: "WEBSITE",
          provider: "TEST",
          idempotencyKey: key,
          status: "SUBMITTED",
        },
      });
      const event = await prisma.outboxEvent.create({
        data: {
          organizationId: organizationA,
          workspaceId: workspaceA,
          messageId: message.id,
          eventType: "SEND_MESSAGE",
          idempotencyKey: key,
          payload: { messageId: message.id },
          status: "PROCESSING",
          attempts: 3,
          maxAttempts: 3,
          lockedAt: new Date(Date.now() - 6 * 60_000),
          lockToken: randomUUID(),
        },
      });
      const { OutboxWorkerService } = requireBuiltApi(
        "../dist/outbox/outbox-worker.service.js",
      ) as { OutboxWorkerService: new (...args: never[]) => unknown };
      const worker = app.get(OutboxWorkerService) as {
        processNext(): Promise<{ processed: boolean; status?: string }>;
      };
      expect(await worker.processNext()).toMatchObject({
        processed: true,
        status: "FAILED",
      });
      expect(
        await prisma.outboxEvent.findUnique({ where: { id: event.id } }),
      ).toMatchObject({
        status: "FAILED",
        attempts: 3,
        lastErrorCode: "DELIVERY_OUTCOME_UNKNOWN",
      });
      expect(
        await prisma.message.findUnique({ where: { id: message.id } }),
      ).toMatchObject({
        status: "SUBMITTED",
      });
    });

    it("holds an uncertain non-idempotent send for reconciliation instead of replaying it", async () => {
      const key = randomUUID();
      const message = await prisma.message.create({
        data: {
          organizationId: organizationA,
          workspaceId: workspaceA,
          conversationId: conversationA,
          direction: "OUTBOUND",
          senderType: "HUMAN",
          content: "Disposable uncertain delivery",
          channel: "WEBSITE",
          provider: "TEST",
          idempotencyKey: key,
          status: "SUBMITTED",
        },
      });
      const event = await prisma.outboxEvent.create({
        data: {
          organizationId: organizationA,
          workspaceId: workspaceA,
          messageId: message.id,
          eventType: "SEND_MESSAGE",
          idempotencyKey: key,
          payload: { messageId: message.id },
          status: "PROCESSING",
          attempts: 1,
          maxAttempts: 3,
          lockedAt: new Date(Date.now() - 6 * 60_000),
          lockToken: randomUUID(),
        },
      });
      const { OutboxWorkerService } = requireBuiltApi(
        "../dist/outbox/outbox-worker.service.js",
      ) as {
        OutboxWorkerService: new (...args: unknown[]) => {
          processNext(): Promise<{ processed: boolean; status?: string }>;
        };
      };
      const { PrismaService } = requireBuiltApi(
        "../dist/database/prisma.service.js",
      ) as { PrismaService: new (...args: never[]) => unknown };
      const { OutboxService } = requireBuiltApi(
        "../dist/outbox/outbox.service.js",
      ) as { OutboxService: new (...args: never[]) => unknown };
      const { ActivityEventService } = requireBuiltApi(
        "../dist/activity/activity.service.js",
      ) as { ActivityEventService: new (...args: never[]) => unknown };
      const { WorkflowControlService } = requireBuiltApi(
        "../dist/workflow-control/workflow-control.service.js",
      ) as { WorkflowControlService: new (...args: never[]) => unknown };
      let sends = 0;
      const worker = new OutboxWorkerService(
        app.get(PrismaService),
        app.get(OutboxService),
        {
          resolve: () => ({
            supportsIdempotentSend: false,
            send: () => {
              sends += 1;
              throw new Error("A replay would duplicate a send.");
            },
          }),
        },
        app.get(ActivityEventService),
        app.get(WorkflowControlService),
      );
      expect(await worker.processNext()).toMatchObject({
        processed: true,
        status: "FAILED",
      });
      expect(sends).toBe(0);
      expect(
        await prisma.outboxEvent.findUnique({ where: { id: event.id } }),
      ).toMatchObject({
        status: "FAILED",
        attempts: 2,
        lastErrorCode: "DELIVERY_OUTCOME_UNKNOWN",
      });
      expect(
        await prisma.message.findUnique({ where: { id: message.id } }),
      ).toMatchObject({
        status: "SUBMITTED",
      });
      expect(
        await prisma.activityEvent.count({
          where: {
            organizationId: organizationA,
            workspaceId: workspaceA,
            resourceId: message.id,
            eventType: "MESSAGE_DELIVERY_UNCERTAIN",
          },
        }),
      ).toBe(1);
    });

    it("validates bounded list input and isolates results", async () => {
      await prisma.conversation.create({
        data: {
          organizationId: organizationB,
          workspaceId: workspaceB,
          createdByMembershipId: memberships.foreign,
          participantName: "Tenant B only",
          channel: "EMAIL",
        },
      });
      const list = await request(
        "/conversations?search=Customer&status=OPEN&limit=10",
        {
          actor: "owner",
          organizationId: organizationA,
          workspaceId: workspaceA,
        },
      );
      expect(list.status).toBe(200);
      const body = (await list.json()) as {
        items: Array<{ id: string }>;
        total: number;
      };
      expect(body.items.map((item) => item.id)).toEqual([conversationA]);
      expect(
        (
          await request("/conversations?limit=1000", {
            actor: "owner",
            organizationId: organizationA,
            workspaceId: workspaceA,
          })
        ).status,
      ).toBe(400);
      expect(
        (
          await request("/conversations?sort=DROP_TABLE", {
            actor: "owner",
            organizationId: organizationA,
            workspaceId: workspaceA,
          })
        ).status,
      ).toBe(400);
    });
  },
);
