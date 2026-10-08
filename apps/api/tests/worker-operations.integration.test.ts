import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertDisposableTestDatabaseUrl } from "../../../tests/disposable-database";
import { PrismaService } from "../src/database/prisma.service";
import {
  WORKER_STALE_AFTER_MS,
  WORKER_STALLED_JOB_AFTER_MS,
  WorkerOperationsService,
} from "../src/worker-operations.service";

const databaseUrl = process.env.TEST_DATABASE_URL;
const enabled =
  process.env.RUN_DATABASE_INTEGRATION_TESTS === "true" && Boolean(databaseUrl);

describe.skipIf(!enabled)("PostgreSQL worker liveness", () => {
  let prisma: PrismaService;
  let operations: WorkerOperationsService;
  const now = new Date("2026-01-01T01:00:00Z");

  beforeAll(async () => {
    assertDisposableTestDatabaseUrl(databaseUrl as string);
    prisma = new PrismaService({ datasourceUrl: databaseUrl });
    await prisma.$connect();
    operations = new WorkerOperationsService(prisma);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("distinguishes active, stopped, crashed, and stalled-job workers", async () => {
    const active = randomUUID();
    const crashed = randomUUID();
    const stalled = randomUUID();
    const failing = randomUUID();
    await operations.register(active, now);
    await operations.register(
      crashed,
      new Date(now.getTime() - WORKER_STALE_AFTER_MS - 1000),
    );
    await operations.register(stalled, now);
    await operations.register(failing, now);
    await operations.heartbeat(
      stalled,
      new Date(now.getTime() - WORKER_STALLED_JOB_AFTER_MS - 1000),
      0,
      now,
    );
    await operations.heartbeat(failing, null, 3, now);
    expect(await operations.status(now)).toMatchObject({
      status: "ready",
      active: 1,
      stalled: 3,
    });
    await operations.stop(active, now);
    expect(await operations.status(now)).toMatchObject({
      status: "unavailable",
      active: 0,
      stalled: 3,
    });
  });
});
