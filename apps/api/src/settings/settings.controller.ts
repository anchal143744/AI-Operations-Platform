import { Body, Controller, Get, Patch } from "@nestjs/common";
import { CurrentTenant } from "../authorization/current-tenant.decorator.js";
import { Permissions } from "../authorization/permissions.js";
import { RequirePermission } from "../authorization/require-permission.decorator.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import { UpdateWorkspaceProfileDto } from "./settings.dto.js";
import { SettingsService } from "./settings.service.js";

@Controller("settings")
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get("general")
  @RequirePermission(Permissions.SETTINGS_READ)
  general(@CurrentTenant() scope: VerifiedTenantScope) {
    return this.settings.general(scope);
  }

  @Patch("general")
  @RequirePermission(Permissions.SETTINGS_MANAGE)
  updateGeneral(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Body() input: UpdateWorkspaceProfileDto,
  ) {
    return this.settings.updateGeneral(scope, input);
  }

  @Get("team")
  @RequirePermission(Permissions.MEMBERSHIP_READ)
  team(@CurrentTenant() scope: VerifiedTenantScope) {
    return this.settings.team(scope);
  }
}
