import { Injectable } from "@nestjs/common";
import { PrismaService } from "./database/prisma.service.js";

export const WORKER_HEARTBEAT_INTERVAL_MS = 5_000;
export const WORKER_STALE_AFTER_MS = 20_000;
export const WORKER_STALLED_JOB_AFTER_MS = 90_000;
export const WORKER_MAX_CONSECUTIVE_ERRORS = 3;

/** Process liveness only. No tenant data, payloads, hostnames, or secrets. */
@Injectable()
export class WorkerOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  register(instanceId: string, now = new Date()) {
    return this.prisma.workerHeartbeat.create({
      data: { instanceId, startedAt: now, heartbeatAt: now },
    });
  }

  heartbeat(
    instanceId: string,
    inFlightSince: Date | null,
    consecutiveErrors: number,
    now = new Date(),
  ) {
    return this.prisma.workerHeartbeat.updateMany({
      where: { instanceId, stoppedAt: null },
      data: { heartbeatAt: now, inFlightSince, consecutiveErrors },
    });
  }

  stop(instanceId: string, now = new Date()) {
    return this.prisma.workerHeartbeat.updateMany({
      where: { instanceId, stoppedAt: null },
      data: { stoppedAt: now, heartbeatAt: now },
    });
  }

  async status(now = new Date()) {
    const staleBefore = new Date(now.getTime() - WORKER_STALE_AFTER_MS);
    const stalledJobBefore = new Date(
      now.getTime() - WORKER_STALLED_JOB_AFTER_MS,
    );
    const [active, stalled] = await Promise.all([
      this.prisma.workerHeartbeat.count({
        where: {
          stoppedAt: null,
          heartbeatAt: { gte: staleBefore },
          consecutiveErrors: { lt: WORKER_MAX_CONSECUTIVE_ERRORS },
          OR: [
            { inFlightSince: null },
            { inFlightSince: { gte: stalledJobBefore } },
          ],
        },
      }),
      this.prisma.workerHeartbeat.count({
        where: {
          stoppedAt: null,
          OR: [
            { heartbeatAt: { lt: staleBefore } },
            { inFlightSince: { lt: stalledJobBefore } },
            { consecutiveErrors: { gte: WORKER_MAX_CONSECUTIVE_ERRORS } },
          ],
        },
      }),
    ]);
    return {
      status: active > 0 ? ("ready" as const) : ("unavailable" as const),
      active,
      stalled,
    };
  }
}
