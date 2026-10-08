import { describe, expect, it } from "vitest";
import { HealthController } from "../apps/api/src/health.controller";

describe("API health boundaries", () => {
  it("distinguishes process liveness from database readiness", async () => {
    const controller = new HealthController(
      {
        $queryRaw: async () => [{ "?column?": 1 }],
      } as never,
      {} as never,
    );
    expect(controller.health()).toMatchObject({ status: "ok" });
    await expect(controller.ready()).resolves.toMatchObject({
      status: "ready",
      database: "reachable",
    });
  });

  it("returns a generic unavailable response when the database fails", async () => {
    const controller = new HealthController(
      {
        $queryRaw: async () => {
          throw new Error("private database endpoint");
        },
      } as never,
      {} as never,
    );
    await expect(controller.ready()).rejects.toMatchObject({
      status: 503,
      response: {
        code: "NOT_READY",
        message: "The API is not ready to serve requests.",
      },
    });
  });

  it("keeps worker readiness distinct from API/database readiness", async () => {
    const ready = new HealthController(
      {} as never,
      {
        status: async () => ({ status: "ready", active: 1, stalled: 0 }),
      } as never,
    );
    await expect(ready.worker()).resolves.toEqual({
      component: "worker",
      status: "ready",
    });

    const unavailable = new HealthController(
      {} as never,
      {
        status: async () => ({ status: "unavailable", active: 0, stalled: 1 }),
      } as never,
    );
    await expect(unavailable.worker()).rejects.toMatchObject({
      status: 503,
      response: { code: "WORKER_NOT_READY" },
    });
  });
});
