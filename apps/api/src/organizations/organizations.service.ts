import { Injectable } from "@nestjs/common";
import type {
  OrganizationBootstrapResponse,
  OrganizationSummary,
  WorkspaceSummary,
} from "@aop/types";
import {
  MembershipRole,
  MembershipStatus,
  OrganizationStatus,
  Prisma,
  WorkspaceStatus,
} from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";
import type {
  BootstrapOrganizationDto,
  CreateWorkspaceDto,
} from "./organizations.dto.js";
import {
  organizationAccessDenied,
  organizationSlugConflict,
  ownerRequired,
  workspaceSlugConflict,
} from "./organizations.errors.js";

function workspaceSummary(workspace: {
  id: string;
  name: string;
  slug: string;
}): WorkspaceSummary {
  return workspace;
}

function uniqueConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrap(
    userId: string,
    input: BootstrapOrganizationDto,
  ): Promise<OrganizationBootstrapResponse> {
    try {
      return await this.prisma.$transaction(async (database) => {
        const organization = await database.organization.create({
          data: { name: input.name, slug: input.slug },
        });
        const membership = await database.membership.create({
          data: {
            userId,
            organizationId: organization.id,
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
          },
        });
        const workspace = await database.workspace.create({
          data: {
            organizationId: organization.id,
            name: input.workspaceName,
            slug: input.workspaceSlug,
          },
        });
        if (input.profile) {
          await database.workspaceSettings.create({
            data: {
              organizationId: organization.id,
              workspaceId: workspace.id,
              website: input.profile.website || null,
              industry: input.profile.industry || null,
              companySize: input.profile.companySize || null,
              timezone: input.profile.timezone || null,
              responseExpectation: input.profile.responseExpectation || null,
            },
          });
        }
        return {
          organization: {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            role: membership.role,
            workspaces: [workspaceSummary(workspace)],
          },
          membershipId: membership.id,
          workspace: workspaceSummary(workspace),
        };
      });
    } catch (error) {
      if (uniqueConflict(error)) throw organizationSlugConflict();
      throw error;
    }
  }

  async list(userId: string): Promise<readonly OrganizationSummary[]> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        status: MembershipStatus.ACTIVE,
        organization: { status: OrganizationStatus.ACTIVE },
      },
      include: {
        organization: {
          include: {
            workspaces: {
              where: { status: WorkspaceStatus.ACTIVE },
              orderBy: [{ name: "asc" }, { id: "asc" }],
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role,
      workspaces: membership.organization.workspaces,
    }));
  }

  private async ownerMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { organization: { select: { status: true } } },
    });
    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.organization.status !== OrganizationStatus.ACTIVE
    ) {
      throw organizationAccessDenied();
    }
    if (membership.role !== MembershipRole.OWNER) throw ownerRequired();
    return membership;
  }

  async listWorkspaces(
    userId: string,
    organizationId: string,
  ): Promise<readonly WorkspaceSummary[]> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { organization: { select: { status: true } } },
    });
    if (
      !membership ||
      membership.status !== MembershipStatus.ACTIVE ||
      membership.organization.status !== OrganizationStatus.ACTIVE
    ) {
      throw organizationAccessDenied();
    }
    return this.prisma.workspace.findMany({
      where: { organizationId, status: WorkspaceStatus.ACTIVE },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true, slug: true },
    });
  }

  async createWorkspace(
    userId: string,
    organizationId: string,
    input: CreateWorkspaceDto,
  ): Promise<WorkspaceSummary> {
    await this.ownerMembership(userId, organizationId);
    try {
      return await this.prisma.workspace.create({
        data: { organizationId, name: input.name, slug: input.slug },
        select: { id: true, name: true, slug: true },
      });
    } catch (error) {
      if (uniqueConflict(error)) throw workspaceSlugConflict();
      throw error;
    }
  }
}
