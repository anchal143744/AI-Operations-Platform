import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module.js";
import { ProvidersModule } from "../communication/providers/providers.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { WorkflowControlModule } from "../workflow-control/workflow-control.module.js";
import { OutboxService } from "./outbox.service.js";
import { OutboxDiagnosticsService } from "./outbox-diagnostics.service.js";
import { OutboxWorkerService } from "./outbox-worker.service.js";

@Module({
  imports: [
    DatabaseModule,
    ActivityModule,
    ProvidersModule,
    WorkflowControlModule,
  ],
  providers: [OutboxService, OutboxWorkerService, OutboxDiagnosticsService],
  exports: [OutboxService, OutboxWorkerService, OutboxDiagnosticsService],
})
export class OutboxModule {}
