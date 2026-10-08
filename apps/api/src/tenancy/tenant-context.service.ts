import { Injectable } from "@nestjs/common";
import {
  MembershipStatus,
  OrganizationStatus,
  WorkspaceStatus,
} from "@prisma/client";
import type { AuthenticatedSession } from "@aop/types";
import { PrismaService } from "../database/prisma.service.js";
import {
  membershipInactive,
  membershipRequired,
  organizationInactive,
  workspaceAccessDenied,
  workspaceInactive,
} from "./tenant-errors.js";
import type { VerifiedTenantScope } from "./tenant-scope.js";

@Injectable()
export class TenantContextService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    session: AuthenticatedSession,
    requestedOrganizationId: string,
    requestedWorkspaceId: string,
  ): Promise<VerifiedTenantScope> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: session.user.id,
          organizationId: requestedOrganizationId,
        },
      },
      select: {
        id: true,
        userId: true,
        organizationId: true,
        role: true,
        status: true,
        organization: { select: { status: true } },
      },
    });

    if (
      !membership ||
      membership.userId !== session.user.id ||
      membership.organizationId !== requestedOrganizationId
    ) {
      throw membershipRequired();
    }
    if (membership.status !== MembershipStatus.ACTIVE) {
      throw membershipInactive();
    }
    if (membership.organization.status !== OrganizationStatus.ACTIVE) {
      throw organizationInactive();
    }

    const workspace = await this.prisma.workspace.findFirst({
      where: {
        id: requestedWorkspaceId,
        organizationId: membership.organizationId,
      },
      select: { id: true, organizationId: true, status: true },
    });

    if (
      !workspace ||
      workspace.id !== requestedWorkspaceId ||
      workspace.organizationId !== membership.organizationId
    ) {
      throw workspaceAccessDenied();
    }
    if (workspace.status !== WorkspaceStatus.ACTIVE) {
      throw workspaceInactive();
    }

    return {
      userId: membership.userId,
      membershipId: membership.id,
      organizationId: membership.organizationId,
      workspaceId: workspace.id,
      role: membership.role,
    } as VerifiedTenantScope;
  }
}
