import { randomUUID } from "node:crypto";
import { type WorkflowExecution } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ActivityEventService } from "../src/activity/activity.service";
import { PrismaService } from "../src/database/prisma.service";
import { OutboxWorkerService } from "../src/outbox/outbox-worker.service";
import { OutboxService } from "../src/outbox/outbox.service";
import type { VerifiedTenantScope } from "../src/tenancy/tenant-scope";
import { WorkflowControlService } from "../src/workflow-control/workflow-control.service";
import { assertDisposableTestDatabaseUrl } from "../../../tests/disposable-database";

const databaseUrl = process.env.TEST_DATABASE_URL;
const enabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" && Boolean(databaseUrl);

describe.skipIf(!enabled)(
  "PostgreSQL workflow recovery and version pins",
  () => {
    let prisma: PrismaService;
    let outbox: OutboxService;
    let workflows: WorkflowControlService;
    let activity: ActivityEventService;
    let scope: VerifiedTenantScope;

    function worker() {
      return new OutboxWorkerService(
        prisma,
        outbox,
        {} as never,
        activity,
        workflows,
      );
    }

    async function approvedNotification(
      name: string,
    ): Promise<WorkflowExecution> {
      const workflow = await workflows.createWorkflow(scope, {
        name,
        actionType: "INTERNAL_NOTIFICATION",
      });
      await workflows.changeStatus(scope, workflow.id, "ACTIVE");
      const execution = await workflows.requestExecution(
        scope,
        workflow.id,
        `run_${randomUUID()}`,
      );
      const request = await prisma.approvalRequest.findFirstOrThrow({
        where: { workflowExecutionId: execution.id },
      });
      await workflows.decide(scope, request.id, { decision: "APPROVED" });
      return execution;
    }

    beforeAll(async () => {
      assertDisposableTestDatabaseUrl(databaseUrl as string);
      prisma = new PrismaService({ datasourceUrl: databaseUrl });
      await prisma.$connect();
      activity = new ActivityEventService(prisma);
      outbox = new OutboxService(prisma);
      workflows = new WorkflowControlService(prisma, activity);
      const suffix = randomUUID();
      const organization = await prisma.organization.create({
        data: { name: "Recovery test", slug: `recovery-${suffix}` },
      });
      const workspace = await prisma.workspace.create({
        data: {
          organizationId: organization.id,
          name: "Recovery workspace",
          slug: "operations",
        },
      });
      const user = await prisma.user.create({
        data: {
          email: `recovery-${suffix}@example.invalid`,
          normalizedEmail: `recovery-${suffix}@example.invalid`,
          name: "Recovery fixture",
          passwordHash: "$test-only-hash$",
        },
      });
      const membership = await prisma.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: "OWNER",
          status: "ACTIVE",
        },
      });
      scope = {
        organizationId: organization.id,
        workspaceId: workspace.id,
        userId: user.id,
        membershipId: membership.id,
        role: "OWNER",
      } as VerifiedTenantScope;
    });

    afterAll(async () => {
      await prisma?.$disconnect();
    });

    it("pins immutable definition versions across policy and definition changes", async () => {
      const workflow = await workflows.createWorkflow(scope, {
        name: "Original definition",
        actionType: "INTERNAL_NOTIFICATION",
      });
      expect(workflow.currentVersion).toBe(1);
      await workflows.changeStatus(scope, workflow.id, "ACTIVE");
      const execution = await workflows.requestExecution(
        scope,
        workflow.id,
        `version_${randomUUID()}`,
      );
      const firstPin = await prisma.workflowExecution.findUniqueOrThrow({
        where: { id: execution.id },
        include: { definitionVersion: true },
      });
      expect(firstPin.definitionVersion).toMatchObject({
        version: 1,
        name: "Original definition",
        policyMode: "REQUIRE_APPROVAL",
      });
      await workflows.changeStatus(scope, workflow.id, "PAUSED");
      await workflows.changeDefinition(scope, workflow.id, {
        name: "Changed definition",
      });
      await workflows.changePolicy(scope, workflow.id, { mode: "BLOCK" });
      const versions = await prisma.workflowDefinitionVersion.findMany({
        where: {
          workflowId: workflow.id,
          ...{
            organizationId: scope.organizationId,
            workspaceId: scope.workspaceId,
          },
        },
        orderBy: { version: "asc" },
      });
      expect(versions.map((version) => version.version)).toEqual([1, 2, 3]);
      expect(versions[0]?.name).toBe("Original definition");
      expect(versions[2]).toMatchObject({
        name: "Changed definition",
        policyMode: "BLOCK",
      });
      await expect(
        prisma.workflowDefinitionVersion.update({
          where: { id: versions[0]!.id },
          data: { name: "Illicit rewrite" },
        }),
      ).rejects.toThrow();
      const stillPinned = await prisma.workflowExecution.findUniqueOrThrow({
        where: { id: execution.id },
        include: { definitionVersion: true },
      });
      expect(stillPinned.definitionVersionId).toBe(
        firstPin.definitionVersionId,
      );
      expect(stillPinned.definitionVersion?.name).toBe("Original definition");
    });

    it("reclaims a crashed lease and reconciles stale RUNNING without duplicating the action", async () => {
      const execution = await approvedNotification("Restarted notification");
      const start = new Date();
      const claimed = await outbox.claimNext(start);
      expect(claimed?.workflowExecutionId).toBe(execution.id);
      const stale = new Date(start.getTime() - 6 * 60_000);
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: "RUNNING", startedAt: stale },
      });
      await prisma.outboxEvent.update({
        where: { id: claimed!.id },
        data: { lockedAt: stale },
      });
      const restarted = worker();
      expect(await restarted.processNext(start)).toMatchObject({
        processed: true,
        status: "COMPLETED",
      });
      expect(
        await worker().processNext(new Date(start.getTime() + 1000)),
      ).toEqual({
        processed: false,
      });
      expect(
        await prisma.notification.count({
          where: { workflowExecutionId: execution.id },
        }),
      ).toBe(1);
      expect(
        await prisma.activityEvent.count({
          where: {
            resourceId: execution.id,
            action: "workflow.execution_recovered",
          },
        }),
      ).toBe(1);
    });

    it("serializes two workers against one approved event", async () => {
      const execution = await approvedNotification("Concurrent notification");
      const [first, second] = await Promise.all([
        worker().processNext(),
        worker().processNext(),
      ]);
      expect([first.processed, second.processed].filter(Boolean)).toHaveLength(
        1,
      );
      expect(
        await prisma.notification.count({
          where: { workflowExecutionId: execution.id },
        }),
      ).toBe(1);
    });

    it("drains a bounded notification backlog with concurrent workers and no duplicate actions", async () => {
      const executions: WorkflowExecution[] = [];
      for (let index = 0; index < 24; index += 1) {
        executions.push(
          await approvedNotification(`Soak notification ${index}`),
        );
      }
      await Promise.all(
        Array.from({ length: 4 }, async () => {
          const instance = worker();
          while (true) {
            const result = await instance.processNext();
            if (!result.processed) break;
          }
        }),
      );
      const executionIds = executions.map(({ id }) => id);
      const [succeeded, notifications, completedOutbox] = await Promise.all([
        prisma.workflowExecution.count({
          where: { id: { in: executionIds }, status: "SUCCEEDED" },
        }),
        prisma.notification.findMany({
          where: { workflowExecutionId: { in: executionIds } },
          select: { workflowExecutionId: true },
        }),
        prisma.outboxEvent.count({
          where: {
            workflowExecutionId: { in: executionIds },
            status: "COMPLETED",
          },
        }),
      ]);
      expect(succeeded).toBe(executionIds.length);
      expect(completedOutbox).toBe(executionIds.length);
      expect(notifications).toHaveLength(executionIds.length);
      expect(
        new Set(
          notifications.map(({ workflowExecutionId }) => workflowExecutionId),
        ).size,
      ).toBe(executionIds.length);
    }, 60_000);

    it("retries a transient failure then succeeds, but exhausts a repeatedly failing action", async () => {
      const retry = await approvedNotification("Retry notification");
      const start = new Date();
      const transient = vi.spyOn(workflows, "processWorkflowAction");
      transient.mockRejectedValueOnce(new Error("temporary local error"));
      expect(await worker().processNext(start)).toMatchObject({
        status: "PENDING",
      });
      transient.mockRestore();
      expect(
        await worker().processNext(new Date(start.getTime() + 31_000)),
      ).toMatchObject({ status: "COMPLETED" });
      expect(
        await prisma.notification.count({
          where: { workflowExecutionId: retry.id },
        }),
      ).toBe(1);

      const exhausted = await approvedNotification("Exhausted notification");
      const failureStart = new Date();
      const failing = vi.spyOn(workflows, "processWorkflowAction");
      failing.mockRejectedValue(new Error("repeated local error"));
      try {
        expect(await worker().processNext(failureStart)).toMatchObject({
          status: "PENDING",
        });
        expect(
          await worker().processNext(new Date(failureStart.getTime() + 31_000)),
        ).toMatchObject({ status: "PENDING" });
        expect(
          await worker().processNext(
            new Date(failureStart.getTime() + 152_000),
          ),
        ).toMatchObject({ status: "FAILED" });
      } finally {
        failing.mockRestore();
      }
      expect(
        await prisma.workflowExecution.findUniqueOrThrow({
          where: { id: exhausted.id },
        }),
      ).toMatchObject({ status: "FAILED" });
      expect(
        await prisma.notification.count({
          where: { workflowExecutionId: exhausted.id },
        }),
      ).toBe(0);
    });
  },
);
