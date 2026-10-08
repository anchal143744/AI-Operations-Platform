import { Injectable } from "@nestjs/common";
import {
  OutboxEventStatus,
  Prisma,
  WorkflowExecutionStatus,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import { OUTBOX_LEASE_MS } from "./outbox.service.js";

/** Aggregate process telemetry only. No tenant, message, or provider payload leaves this boundary. */
@Injectable()
export class OutboxDiagnosticsService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(now = new Date()) {
    const staleBefore = new Date(now.getTime() - OUTBOX_LEASE_MS);
    const [
      pending,
      processing,
      failed,
      oldestPending,
      staleProcessing,
      retryPending,
      retryExhausted,
      runningExecutions,
      failedExecutions,
      staleExecutions,
    ] = await Promise.all([
      this.prisma.outboxEvent.count({
        where: { status: OutboxEventStatus.PENDING },
      }),
      this.prisma.outboxEvent.count({
        where: { status: OutboxEventStatus.PROCESSING },
      }),
      this.prisma.outboxEvent.count({
        where: { status: OutboxEventStatus.FAILED },
      }),
      this.prisma.outboxEvent.findFirst({
        where: { status: OutboxEventStatus.PENDING },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      }),
      this.prisma.outboxEvent.count({
        where: {
          status: OutboxEventStatus.PROCESSING,
          lockedAt: { lt: staleBefore },
        },
      }),
      this.prisma.outboxEvent.count({
        where: { status: OutboxEventStatus.PENDING, attempts: { gt: 0 } },
      }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
          SELECT COUNT(*) AS count FROM "outbox_events"
          WHERE "status" = 'FAILED'::"outbox_event_status"
            AND "attempts" >= "max_attempts"
        `),
      this.prisma.workflowExecution.count({
        where: { status: WorkflowExecutionStatus.RUNNING },
      }),
      this.prisma.workflowExecution.count({
        where: { status: WorkflowExecutionStatus.FAILED },
      }),
      this.prisma.workflowExecution.count({
        where: {
          status: WorkflowExecutionStatus.RUNNING,
          startedAt: { lt: staleBefore },
        },
      }),
    ]);

    return {
      event: "outbox.snapshot" as const,
      pending,
      processing,
      failed,
      staleProcessing,
      retryPending,
      retryExhausted: Number(retryExhausted[0]?.count ?? 0),
      runningExecutions,
      failedExecutions,
      staleExecutions,
      oldestPendingAgeSeconds: oldestPending
        ? Math.max(
            0,
            Math.floor(
              (now.getTime() - oldestPending.createdAt.getTime()) / 1000,
            ),
          )
        : null,
    };
  }
}
