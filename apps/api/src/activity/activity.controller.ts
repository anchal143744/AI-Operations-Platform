import { Controller, Get, Query } from "@nestjs/common";
import { CurrentTenant } from "../authorization/current-tenant.decorator.js";
import { Permissions } from "../authorization/permissions.js";
import { RequirePermission } from "../authorization/require-permission.decorator.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import { ListActivityDto } from "./activity.dto.js";
import { ActivityEventService } from "./activity.service.js";

@Controller("activity")
export class ActivityController {
  constructor(private readonly activity: ActivityEventService) {}

  @Get()
  @RequirePermission(Permissions.ACTIVITY_READ)
  list(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Query() query: ListActivityDto,
  ) {
    return this.activity.list(scope, query);
  }
}
