import { Injectable, NotFoundException } from "@nestjs/common";
import type { TeamMemberRecord, WorkspaceProfile } from "@aop/types";
import {
  ActivityEventType,
  type Workspace,
  type WorkspaceSettings,
} from "@prisma/client";
import { ActivityEventService } from "../activity/activity.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import type { UpdateWorkspaceProfileDto } from "./settings.dto.js";

function present(
  workspace: Workspace,
  settings: WorkspaceSettings | null,
): WorkspaceProfile {
  return {
    workspaceName: workspace.name,
    website: settings?.website ?? "",
    industry: settings?.industry ?? "",
    companySize: settings?.companySize ?? "",
    timezone: settings?.timezone ?? "",
    responseExpectation: settings?.responseExpectation ?? "",
  };
}

function notFound() {
  return new NotFoundException({
    statusCode: 404,
    code: "WORKSPACE_NOT_FOUND",
    message: "The selected workspace is not available.",
  });
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityEventService,
  ) {}

  async general(scope: VerifiedTenantScope): Promise<WorkspaceProfile> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id: scope.workspaceId, organizationId: scope.organizationId },
      include: { settings: true },
    });
    if (!workspace) throw notFound();
    return present(workspace, workspace.settings);
  }

  async updateGeneral(
    scope: VerifiedTenantScope,
    input: UpdateWorkspaceProfileDto,
  ): Promise<WorkspaceProfile> {
    const result = await this.prisma.$transaction(async (database) => {
      const changed = await database.workspace.updateMany({
        where: { id: scope.workspaceId, organizationId: scope.organizationId },
        data: { name: input.workspaceName },
      });
      if (!changed.count) throw notFound();
      const settings = await database.workspaceSettings.upsert({
        where: {
          workspaceId_organizationId: {
            workspaceId: scope.workspaceId,
            organizationId: scope.organizationId,
          },
        },
        create: {
          workspaceId: scope.workspaceId,
          organizationId: scope.organizationId,
          website: input.website || null,
          industry: input.industry || null,
          companySize: input.companySize || null,
          timezone: input.timezone || null,
          responseExpectation: input.responseExpectation || null,
        },
        update: {
          website: input.website || null,
          industry: input.industry || null,
          companySize: input.companySize || null,
          timezone: input.timezone || null,
          responseExpectation: input.responseExpectation || null,
        },
      });
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.SETTINGS_UPDATED,
          action: "settings.general.updated",
          summary: "Workspace profile settings were updated.",
          resourceType: "WORKSPACE",
          resourceId: scope.workspaceId,
        },
        database,
      );
      const workspace = await database.workspace.findFirstOrThrow({
        where: { id: scope.workspaceId, organizationId: scope.organizationId },
      });
      return present(workspace, settings);
    });
    return result;
  }

  async team(scope: VerifiedTenantScope): Promise<readonly TeamMemberRecord[]> {
    const members = await this.prisma.membership.findMany({
      where: { organizationId: scope.organizationId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    });
    return members.map((member) => ({
      id: member.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      status: member.status,
      lastActiveAt: null,
    }));
  }
}
