import { Injectable } from "@nestjs/common";
import {
  OutboxEventStatus,
  OutboxEventType,
  Prisma,
  type OutboxEvent,
} from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../database/prisma.service.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";

export type OutboxDatabase = Prisma.TransactionClient | PrismaService;
export const OUTBOX_LEASE_MS = 5 * 60_000;

export function outboxRetryDelayMs(attempts: number) {
  return (
    [30_000, 120_000, 600_000][Math.max(0, Math.min(attempts - 1, 2))] ??
    600_000
  );
}

@Injectable()
export class OutboxService {
  constructor(private readonly prisma: PrismaService) {}

  enqueueMessage(
    scope: VerifiedTenantScope,
    input: Readonly<{
      messageId: string;
      idempotencyKey: string;
    }>,
    database: OutboxDatabase,
  ) {
    return database.outboxEvent.create({
      data: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        messageId: input.messageId,
        eventType: OutboxEventType.SEND_MESSAGE,
        idempotencyKey: input.idempotencyKey,
        payload: { messageId: input.messageId },
        maxAttempts: 3,
      },
    });
  }

  async claimNext(now = new Date(), staleAfterMs = OUTBOX_LEASE_MS) {
    const staleBefore = new Date(now.getTime() - staleAfterMs);
    return this.prisma.$transaction(async (database) => {
      const rows = await database.$queryRaw<
        Array<{
          id: string;
          status: OutboxEventStatus;
          attempts: number;
          max_attempts: number;
        }>
      >(Prisma.sql`
        SELECT "id"
             , "status", "attempts", "max_attempts"
        FROM "outbox_events"
        WHERE ("status" = 'PENDING'::"outbox_event_status" AND "attempts" < "max_attempts" AND "next_attempt_at" <= ${now})
           OR ("status" = 'PROCESSING'::"outbox_event_status" AND "locked_at" < ${staleBefore})
        ORDER BY "next_attempt_at" ASC, "created_at" ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      `);
      const selected = rows[0];
      if (!selected) return null;
      const lockToken = randomUUID();
      const exhausted =
        selected.status === OutboxEventStatus.PROCESSING &&
        selected.attempts >= selected.max_attempts;
      const event = await database.outboxEvent.update({
        where: { id: selected.id },
        data: {
          status: OutboxEventStatus.PROCESSING,
          ...(!exhausted ? { attempts: { increment: 1 } } : {}),
          lockedAt: now,
          lockToken,
        },
      });
      return {
        ...event,
        exhausted,
        reclaimed: selected.status === OutboxEventStatus.PROCESSING,
      };
    });
  }

  retryDelayMs(attempts: number) {
    return outboxRetryDelayMs(attempts);
  }

  isOwnedLock(event: OutboxEvent, lockToken: string) {
    return (
      event.status === OutboxEventStatus.PROCESSING &&
      event.lockToken === lockToken
    );
  }
}
