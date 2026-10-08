import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module.js";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { LeadsController } from "./leads.controller.js";
import { LeadsService } from "./leads.service.js";

@Module({
  imports: [DatabaseModule, AuthorizationModule, ActivityModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
