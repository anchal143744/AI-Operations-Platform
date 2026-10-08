import { describe, expect, it, vi } from "vitest";
import {
  WorkerOperationsService,
  WORKER_STALE_AFTER_MS,
  WORKER_STALLED_JOB_AFTER_MS,
  WORKER_MAX_CONSECUTIVE_ERRORS,
} from "../apps/api/src/worker-operations.service";

describe("worker operations", () => {
  it("records a process heartbeat and closes it on graceful shutdown", async () => {
    const create = vi.fn().mockResolvedValue({});
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const service = new WorkerOperationsService({
      workerHeartbeat: { create, updateMany },
    } as never);
    const now = new Date("2026-01-01T00:00:00Z");
    await service.register("instance", now);
    await service.heartbeat("instance", now, 0, now);
    await service.stop("instance", now);
    expect(create).toHaveBeenCalledWith({
      data: { instanceId: "instance", startedAt: now, heartbeatAt: now },
    });
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { instanceId: "instance", stoppedAt: null },
      data: { heartbeatAt: now, inFlightSince: now, consecutiveErrors: 0 },
    });
    expect(updateMany).toHaveBeenNthCalledWith(2, {
      where: { instanceId: "instance", stoppedAt: null },
      data: { stoppedAt: now, heartbeatAt: now },
    });
  });

  it("treats a missed heartbeat or long-running poll as stalled", async () => {
    const count = vi.fn().mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    const service = new WorkerOperationsService({
      workerHeartbeat: { count },
    } as never);
    const now = new Date("2026-01-01T00:00:00Z");
    expect(await service.status(now)).toEqual({
      status: "unavailable",
      active: 0,
      stalled: 2,
    });
    expect(count).toHaveBeenNthCalledWith(1, {
      where: {
        stoppedAt: null,
        heartbeatAt: {
          gte: new Date(now.getTime() - WORKER_STALE_AFTER_MS),
        },
        consecutiveErrors: { lt: WORKER_MAX_CONSECUTIVE_ERRORS },
        OR: [
          { inFlightSince: null },
          {
            inFlightSince: {
              gte: new Date(now.getTime() - WORKER_STALLED_JOB_AFTER_MS),
            },
          },
        ],
      },
    });
  });
});
