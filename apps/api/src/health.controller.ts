import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "./database/prisma.service.js";
import { WorkerOperationsService } from "./worker-operations.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workers: WorkerOperationsService,
  ) {}

  @Get()
  health() {
    return { status: "ok", component: "api" };
  }

  @Get("ready")
  async ready() {
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
      return { status: "ready", component: "api", database: "reachable" };
    } catch {
      throw new ServiceUnavailableException({
        code: "NOT_READY",
        message: "The API is not ready to serve requests.",
      });
    }
  }

  @Get("worker")
  async worker() {
    try {
      const status = await this.workers.status();
      if (status.status === "unavailable") {
        throw new ServiceUnavailableException({
          code: "WORKER_NOT_READY",
          message: "No active background worker is reporting readiness.",
        });
      }
      return { component: "worker", status: "ready" as const };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException({
        code: "WORKER_NOT_READY",
        message: "Background worker readiness is unavailable.",
      });
    }
  }
}
