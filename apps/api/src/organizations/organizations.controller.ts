import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  UseGuards,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { ActivityEventType } from "@prisma/client";
import type { AuthenticatedSession } from "@aop/types";
import { ActivityEventService } from "../activity/activity.service.js";
import { AuthCookieService } from "../auth/auth-cookie.service.js";
import { CurrentSession } from "../auth/current-session.decorator.js";
import { SessionAuthGuard } from "../auth/session-auth.guard.js";
import { SessionService } from "../auth/session.service.js";
import { TenantContextService } from "../tenancy/tenant-context.service.js";
import {
  BootstrapOrganizationDto,
  CreateWorkspaceDto,
  SelectWorkspaceDto,
} from "./organizations.dto.js";
import { OrganizationsService } from "./organizations.service.js";

@Controller("organizations")
@UseGuards(SessionAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly organizations: OrganizationsService,
    private readonly sessions: SessionService,
    private readonly cookies: AuthCookieService,
    private readonly tenants: TenantContextService,
    private readonly activity: ActivityEventService,
  ) {}

  @Patch("active-workspace")
  async selectActiveWorkspace(
    @CurrentSession() session: AuthenticatedSession,
    @Req() request: Request,
    @Body() input: SelectWorkspaceDto,
  ) {
    const scope = await this.tenants.resolve(
      session,
      input.organizationId,
      input.workspaceId,
    );
    const rawToken = this.cookies.readSession(request);
    if (!rawToken) return session;
    const updated = await this.sessions.selectActiveWorkspace(
      rawToken,
      scope.organizationId,
      scope.workspaceId,
    );
    await this.activity.recordUser(scope, {
      eventType: ActivityEventType.WORKSPACE_SELECTED,
      action: "workspace.selected",
      summary: "The active workspace preference was changed.",
      resourceType: "WORKSPACE",
      resourceId: scope.workspaceId,
    });
    return updated;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  bootstrap(
    @CurrentSession() session: AuthenticatedSession,
    @Body() input: BootstrapOrganizationDto,
  ) {
    return this.organizations.bootstrap(session.user.id, input);
  }

  @Get()
  list(@CurrentSession() session: AuthenticatedSession) {
    return this.organizations.list(session.user.id);
  }

  @Get(":organizationId/workspaces")
  listWorkspaces(
    @CurrentSession() session: AuthenticatedSession,
    @Param("organizationId", new ParseUUIDPipe({ version: "4" }))
    organizationId: string,
  ) {
    return this.organizations.listWorkspaces(session.user.id, organizationId);
  }

  @Post(":organizationId/workspaces")
  @HttpCode(HttpStatus.CREATED)
  createWorkspace(
    @CurrentSession() session: AuthenticatedSession,
    @Param("organizationId", new ParseUUIDPipe({ version: "4" }))
    organizationId: string,
    @Body() input: CreateWorkspaceDto,
  ) {
    return this.organizations.createWorkspace(
      session.user.id,
      organizationId,
      input,
    );
  }
}
