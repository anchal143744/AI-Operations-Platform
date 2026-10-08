import { Controller, Get, Param, ParseUUIDPipe, Patch } from "@nestjs/common";
import { CurrentTenant } from "../authorization/current-tenant.decorator.js";
import { Permissions } from "../authorization/permissions.js";
import { RequirePermission } from "../authorization/require-permission.decorator.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import { NotificationsService } from "./notifications.service.js";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @RequirePermission(Permissions.WORKSPACE_READ)
  list(@CurrentTenant() scope: VerifiedTenantScope) {
    return this.notifications.list(scope);
  }

  @Patch(":notificationId/read")
  @RequirePermission(Permissions.WORKSPACE_READ)
  markRead(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("notificationId", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.notifications.markRead(scope, id);
  }
}
