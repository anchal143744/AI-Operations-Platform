import { Injectable } from "@nestjs/common";
import {
  MembershipStatus,
  OrganizationStatus,
  UserStatus,
  WorkspaceStatus,
} from "@prisma/client";
import type { AuthenticatedSession } from "@aop/types";
import { PrismaService } from "../database/prisma.service.js";
import { AuthConfig } from "./auth.config.js";
import { invalidSession } from "./auth.errors.js";
import { AuthTokenService } from "./token.service.js";

const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: AuthTokenService,
    private readonly config: AuthConfig,
  ) {}

  async create(
    userId: string,
    rememberMe: boolean,
  ): Promise<
    Readonly<{
      rawToken: string;
      expiresAt: Date;
      session: AuthenticatedSession;
    }>
  > {
    const issued = this.tokens.issueOpaqueToken();
    const expiresAt = this.tokens.expiresIn(
      rememberMe
        ? this.config.rememberedSessionTtlMs
        : this.config.sessionTtlMs,
    );

    await this.prisma.session.create({
      data: { userId, tokenHash: issued.tokenHash, expiresAt },
    });

    return {
      rawToken: issued.rawToken,
      expiresAt,
      session: await this.authenticate(issued.rawToken),
    };
  }

  async authenticate(rawToken: string): Promise<AuthenticatedSession> {
    const tokenHash = this.tokens.hash(rawToken);
    const record = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: {
              where: {
                status: MembershipStatus.ACTIVE,
                organization: { status: OrganizationStatus.ACTIVE },
              },
              include: {
                organization: {
                  include: {
                    workspaces: {
                      where: { status: WorkspaceStatus.ACTIVE },
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const now = new Date();

    if (
      !record ||
      record.revokedAt ||
      this.tokens.isExpired(record.expiresAt, now) ||
      record.user.status !== UserStatus.ACTIVE ||
      !record.user.emailVerifiedAt
    ) {
      throw invalidSession();
    }

    const workspaceAccess = record.user.memberships.map((membership) => ({
      organizationId: membership.organizationId,
      organizationName: membership.organization.name,
      membershipId: membership.id,
      role: membership.role,
      workspaceIds: membership.organization.workspaces.map(
        (workspace) => workspace.id,
      ),
      workspaces: membership.organization.workspaces.map((workspace) => ({
        id: workspace.id,
        name: workspace.name,
      })),
    }));
    const activeWorkspace =
      record.activeOrganizationId && record.activeWorkspaceId
        ? workspaceAccess.some(
            (access) =>
              access.organizationId === record.activeOrganizationId &&
              access.workspaceIds.includes(record.activeWorkspaceId as string),
          )
          ? {
              organizationId: record.activeOrganizationId,
              workspaceId: record.activeWorkspaceId,
            }
          : null
        : null;
    if (
      !activeWorkspace &&
      (record.activeOrganizationId || record.activeWorkspaceId)
    ) {
      await this.prisma.session.updateMany({
        where: { id: record.id },
        data: { activeOrganizationId: null, activeWorkspaceId: null },
      });
    }

    if (
      !record.lastUsedAt ||
      now.getTime() - record.lastUsedAt.getTime() >= LAST_USED_WRITE_INTERVAL_MS
    ) {
      await this.prisma.session.updateMany({
        where: { id: record.id, revokedAt: null, expiresAt: { gt: now } },
        data: { lastUsedAt: now },
      });
    }

    return {
      user: {
        id: record.user.id,
        email: record.user.email,
        name: record.user.name,
        emailVerified: true,
      },
      session: { expiresAt: record.expiresAt.toISOString() },
      workspaceAccess,
      activeWorkspace,
    };
  }

  async selectActiveWorkspace(
    rawToken: string,
    organizationId: string,
    workspaceId: string,
  ): Promise<AuthenticatedSession> {
    const session = await this.authenticate(rawToken);
    const allowed = session.workspaceAccess.some(
      (access) =>
        access.organizationId === organizationId &&
        access.workspaceIds.includes(workspaceId),
    );
    if (!allowed) throw invalidSession();
    const updated = await this.prisma.session.updateMany({
      where: {
        tokenHash: this.tokens.hash(rawToken),
        userId: session.user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        activeOrganizationId: organizationId,
        activeWorkspaceId: workspaceId,
      },
    });
    if (updated.count !== 1) throw invalidSession();
    return this.authenticate(rawToken);
  }

  async revoke(rawToken: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash: this.tokens.hash(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(
    userId: string,
    revokedAt = new Date(),
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt },
    });
  }
}
