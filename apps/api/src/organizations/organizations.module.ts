import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ActivityModule } from "../activity/activity.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { TenancyModule } from "../tenancy/tenancy.module.js";
import { OrganizationsController } from "./organizations.controller.js";
import { OrganizationsService } from "./organizations.service.js";

@Module({
  imports: [DatabaseModule, AuthModule, TenancyModule, ActivityModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
