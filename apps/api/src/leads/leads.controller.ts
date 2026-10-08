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
import { CreateLeadDto, ListLeadsDto, UpdateLeadDto } from "./leads.dto.js";
import { LeadsService } from "./leads.service.js";

@Controller("leads")
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermission(Permissions.LEADS_READ)
  list(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Query() query: ListLeadsDto,
  ) {
    return this.leads.list(scope, query);
  }

  @Get("summary")
  @RequirePermission(Permissions.LEADS_READ)
  summary(@CurrentTenant() scope: VerifiedTenantScope) {
    return this.leads.summary(scope);
  }

  @Get(":leadId")
  @RequirePermission(Permissions.LEADS_READ)
  get(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("leadId", new ParseUUIDPipe({ version: "4" })) leadId: string,
  ) {
    return this.leads.get(scope, leadId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permissions.LEADS_CREATE)
  create(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Body() input: CreateLeadDto,
  ) {
    return this.leads.create(scope, input);
  }

  @Patch(":leadId")
  @RequirePermission(Permissions.LEADS_UPDATE)
  update(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("leadId", new ParseUUIDPipe({ version: "4" })) leadId: string,
    @Body() input: UpdateLeadDto,
  ) {
    return this.leads.update(scope, leadId, input);
  }
}
