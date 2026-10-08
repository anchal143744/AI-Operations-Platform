import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module.js";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { ConversationsController } from "./conversations.controller.js";
import { ConversationsService } from "./conversations.service.js";

@Module({
  imports: [DatabaseModule, AuthorizationModule, ActivityModule],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
