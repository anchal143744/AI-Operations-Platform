import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module.js";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { DatabaseModule } from "../database/database.module.js";
import {
  ApprovalsController,
  WorkflowsController,
} from "./workflow-control.controller.js";
import { WorkflowControlService } from "./workflow-control.service.js";

@Module({
  imports: [DatabaseModule, AuthorizationModule, ActivityModule],
  controllers: [WorkflowsController, ApprovalsController],
  providers: [WorkflowControlService],
  exports: [WorkflowControlService],
})
export class WorkflowControlModule {}
