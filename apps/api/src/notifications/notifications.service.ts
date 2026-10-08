import { Injectable, NotFoundException } from "@nestjs/common";
import { ActivityEventType } from "@prisma/client";
import { ActivityEventService } from "../activity/activity.service.js";
import { PrismaService } from "../database/prisma.service.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";

const owner = (scope: VerifiedTenantScope) => ({
  organizationId: scope.organizationId,
  workspaceId: scope.workspaceId,
  recipientMembershipId: scope.membershipId,
});

const publicFields = {
  id: true,
  title: true,
  body: true,
  workflowExecutionId: true,
  workflowExecution: { select: { workflowId: true } },
  createdAt: true,
  readAt: true,
} as const;

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityEventService,
  ) {}

  async list(scope: VerifiedTenantScope) {
    const where = owner(scope);
    const [items, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        select: publicFields,
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      this.prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(scope: VerifiedTenantScope, id: string) {
    return this.prisma.$transaction(async (database) => {
      const current = await database.notification.findFirst({
        where: { ...owner(scope), id },
        select: publicFields,
      });
      if (!current) {
        throw new NotFoundException({
          code: "RESOURCE_NOT_FOUND",
          message: "Resource not found.",
        });
      }
      if (current.readAt) return current;
      const changed = await database.notification.updateMany({
        where: { ...owner(scope), id, readAt: null },
        data: { readAt: new Date() },
      });
      if (changed.count === 1) {
        await this.activity.recordUser(
          scope,
          {
            eventType: ActivityEventType.NOTIFICATION_READ,
            action: "notification.read",
            summary: "An internal notification was read.",
            resourceType: "NOTIFICATION",
            resourceId: id,
          },
          database,
        );
      }
      return database.notification.findFirstOrThrow({
        where: { ...owner(scope), id },
        select: publicFields,
      });
    });
  }
}
