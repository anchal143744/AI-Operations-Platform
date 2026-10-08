import { Module } from "@nestjs/common";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { ActivityController } from "./activity.controller.js";
import { ActivityEventService } from "./activity.service.js";

@Module({
  imports: [DatabaseModule, AuthorizationModule],
  controllers: [ActivityController],
  providers: [ActivityEventService],
  exports: [ActivityEventService],
})
export class ActivityModule {}
