import { Module } from "@nestjs/common";
import { ActivityModule } from "./activity/activity.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { AuthorizationModule } from "./authorization/authorization.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { FollowUpsModule } from "./follow-ups/follow-ups.module.js";
import { ConversationsModule } from "./conversations/conversations.module.js";
import { CommunicationModule } from "./communication/communication.module.js";
import { HealthController } from "./health.controller.js";
import { LeadsModule } from "./leads/leads.module.js";
import { NotificationsModule } from "./notifications/notifications.module.js";
import { OrganizationsModule } from "./organizations/organizations.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { TenancyModule } from "./tenancy/tenancy.module.js";
import { WorkflowControlModule } from "./workflow-control/workflow-control.module.js";
import { WorkerOperationsService } from "./worker-operations.service.js";

@Module({
  imports: [
    DatabaseModule,
    FollowUpsModule,
    ActivityModule,
    AuthModule,
    TenancyModule,
    AuthorizationModule,
    ConversationsModule,
    CommunicationModule,
    LeadsModule,
    NotificationsModule,
    OrganizationsModule,
    SettingsModule,
    WorkflowControlModule,
  ],
  controllers: [HealthController],
  providers: [WorkerOperationsService],
})
export class AppModule {}
