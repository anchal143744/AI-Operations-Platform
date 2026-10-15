import { NestFactory } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { OutboxDiagnosticsService } from "./outbox/outbox-diagnostics.service.js";
import { OutboxWorkerService } from "./outbox/outbox-worker.service.js";
import {
  WORKER_HEARTBEAT_INTERVAL_MS,
  WorkerOperationsService,
} from "./worker-operations.service.js";
import { WorkerModule } from "./worker.module.js";

function emit(level: "info" | "warn" | "error", event: string, fields = {}) {
  process.stdout.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), level, component: "outbox-worker", event, ...fields })}\n`,
  );
}

function pollInterval() {
  const parsed = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? "1000");
  return Number.isInteger(parsed) && parsed >= 100 && parsed <= 60_000
    ? parsed
    : 1000;
}

async function bootstrap() {
  const application = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["error", "warn", "log"],
  });
  const worker = application.get(OutboxWorkerService);
  const diagnostics = application.get(OutboxDiagnosticsService);
  const operations = application.get(WorkerOperationsService);
  const instanceId = randomUUID();
  let stopping = false;
  const stop = () => {
    stopping = true;
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  // Windows child_process.kill() terminates processes rather than reliably
  // delivering POSIX signals. The local supervisor uses this IPC request.
  process.once("message", (message: unknown) => {
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "shutdown"
    ) {
      stop();
    }
  });
  let heartbeatInFlight: Promise<unknown> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  let registered = false;
  let inFlightSince: Date | null = null;
  let consecutiveErrors = 0;
  try {
    await operations.register(instanceId);
    registered = true;
    emit("info", "worker.started");
    if (process.connected) process.send?.({ type: "ready" });
    heartbeatTimer = setInterval(() => {
      if (heartbeatInFlight || stopping) return;
      heartbeatInFlight = operations
        .heartbeat(instanceId, inFlightSince, consecutiveErrors)
        .catch(() => {
          emit("error", "worker.heartbeat_failed");
        })
        .finally(() => {
          heartbeatInFlight = null;
        });
    }, WORKER_HEARTBEAT_INTERVAL_MS);
    let nextSnapshotAt = 0;
    while (!stopping) {
      try {
        if (Date.now() >= nextSnapshotAt) {
          nextSnapshotAt = Date.now() + 60_000;
          try {
            emit("info", "worker.metrics", {
              outbox: await diagnostics.snapshot(),
              workers: await operations.status(),
            });
          } catch {
            // Telemetry must not block queued business work.
            emit("error", "worker.metrics_failed");
          }
        }
        if (stopping) break;
        inFlightSince = new Date();
        const result = await worker.processNext();
        inFlightSince = null;
        consecutiveErrors = 0;
        if (result.processed) {
          emit(
            result.status === "COMPLETED" ? "info" : "warn",
            "outbox.attempt",
            {
              status: result.status,
            },
          );
        } else {
          await delay(pollInterval());
        }
      } catch {
        inFlightSince = null;
        consecutiveErrors += 1;
        emit("error", "worker.poll_failed", { retryDelayMs: 5000 });
        if (!stopping) await delay(5000);
      }
    }
  } finally {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (heartbeatInFlight) await heartbeatInFlight;
    if (registered) {
      try {
        await operations.stop(instanceId);
      } catch {
        emit("error", "worker.stop_heartbeat_failed");
      }
    }
    await application.close();
    emit("info", "worker.stopped");
    if (process.connected) process.disconnect();
  }
}

void bootstrap().catch(() => {
  emit("error", "worker.startup_failed");
  process.exitCode = 1;
});
