import { Module } from "@nestjs/common";
import { OutboxModule } from "./outbox/outbox.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { WorkerOperationsService } from "./worker-operations.service.js";

@Module({
  imports: [OutboxModule, DatabaseModule],
  providers: [WorkerOperationsService],
})
export class WorkerModule {}
