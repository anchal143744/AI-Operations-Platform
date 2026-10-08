import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { TenantContextService } from "./tenant-context.service.js";

@Module({
  imports: [DatabaseModule],
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenancyModule {}
