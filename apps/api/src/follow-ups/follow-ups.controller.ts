import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentTenant } from "../authorization/current-tenant.decorator.js";
import { Permissions } from "../authorization/permissions.js";
import { RequirePermission } from "../authorization/require-permission.decorator.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import {
  CreateFollowUpDto,
  ListFollowUpsDto,
  RescheduleFollowUpDto,
} from "./follow-ups.dto.js";
import { FollowUpsService } from "./follow-ups.service.js";

@Controller("follow-ups")
export class FollowUpsController {
  constructor(private readonly followUps: FollowUpsService) {}

  @Get()
  @RequirePermission(Permissions.FOLLOW_UPS_READ)
  list(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Query() query: ListFollowUpsDto,
  ) {
    return this.followUps.list(scope, query);
  }

  @Get("summary")
  @RequirePermission(Permissions.FOLLOW_UPS_READ)
  summary(@CurrentTenant() scope: VerifiedTenantScope) {
    return this.followUps.summary(scope);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permissions.FOLLOW_UPS_MANAGE)
  create(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Body() input: CreateFollowUpDto,
  ) {
    return this.followUps.create(scope, input);
  }

  @Patch(":followUpId/complete")
  @RequirePermission(Permissions.FOLLOW_UPS_MANAGE)
  complete(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("followUpId", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.followUps.complete(scope, id);
  }

  @Patch(":followUpId/reschedule")
  @RequirePermission(Permissions.FOLLOW_UPS_MANAGE)
  reschedule(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("followUpId", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: RescheduleFollowUpDto,
  ) {
    return this.followUps.reschedule(scope, id, input);
  }
}
