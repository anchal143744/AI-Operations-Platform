import { Injectable } from "@nestjs/common";
import {
  ActivityActorType,
  ActivityEventType,
  type Prisma,
} from "@prisma/client";
import type { ActivityListResponse, ActivityRecord } from "@aop/types";
import { PrismaService } from "../database/prisma.service.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import type { ListActivityDto } from "./activity.dto.js";

type RecordActivity = Readonly<{
  eventType: ActivityEventType;
  action: string;
  summary: string;
  resourceType?: string;
  resourceId?: string;
  actorType?: ActivityActorType;
  metadata?: Prisma.InputJsonValue;
  leadId?: string;
  conversationId?: string;
  followUpId?: string;
  workflowId?: string;
  approvalRequestId?: string;
}>;

type ControlledActivityScope = Pick<
  VerifiedTenantScope,
  "organizationId" | "workspaceId"
>;

const categoryEvents: Record<
  Exclude<NonNullable<ListActivityDto["category"]>, "ALL">,
  readonly ActivityEventType[]
> = {
  AI_OPERATIONS: [], // No AI execution events exist yet.
  APPROVALS: [
    ActivityEventType.APPROVAL_DECIDED,
    ActivityEventType.APPROVAL_EXPIRED,
  ],
  WORKFLOWS: [
    ActivityEventType.WORKFLOW_CREATED,
    ActivityEventType.WORKFLOW_DEFINITION_CHANGED,
    ActivityEventType.WORKFLOW_STATUS_CHANGED,
    ActivityEventType.POLICY_CHANGED,
    ActivityEventType.POLICY_EVALUATED,
    ActivityEventType.APPROVAL_DECIDED,
    ActivityEventType.APPROVAL_EXPIRED,
    ActivityEventType.WORKFLOW_EXECUTION_CHANGED,
    ActivityEventType.NOTIFICATION_CREATED,
    ActivityEventType.NOTIFICATION_READ,
  ],
  CUSTOMER_OPERATIONS: [
    ActivityEventType.LEAD_CREATED,
    ActivityEventType.LEAD_UPDATED,
    ActivityEventType.FOLLOW_UP_CREATED,
    ActivityEventType.FOLLOW_UP_COMPLETED,
    ActivityEventType.FOLLOW_UP_RESCHEDULED,
    ActivityEventType.CONVERSATION_CREATED,
    ActivityEventType.MESSAGE_RECORDED,
    ActivityEventType.MESSAGE_QUEUED,
    ActivityEventType.MESSAGE_SUBMITTED,
    ActivityEventType.MESSAGE_DELIVERY_ACCEPTED,
    ActivityEventType.MESSAGE_DELIVERY_UNCERTAIN,
    ActivityEventType.MESSAGE_DELIVERED,
    ActivityEventType.MESSAGE_FAILED,
    ActivityEventType.WEBHOOK_RECEIVED,
  ],
  SYSTEM: [
    ActivityEventType.ORGANIZATION_CREATED,
    ActivityEventType.WORKSPACE_CREATED,
    ActivityEventType.WORKSPACE_SELECTED,
    ActivityEventType.SETTINGS_UPDATED,
  ],
  SECURITY: [ActivityEventType.USER_LOGIN, ActivityEventType.USER_LOGOUT],
};

export function activityDateStart(
  range: ListActivityDto["dateRange"],
  now = new Date(),
): Date | undefined {
  if (!range || range === "ANY") return undefined;
  if (range === "TODAY") {
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
  }
  return new Date(
    now.getTime() - (range === "LAST_7_DAYS" ? 7 : 30) * 24 * 60 * 60_000,
  );
}

@Injectable()
export class ActivityEventService {
  constructor(private readonly prisma: PrismaService) {}

  recordUser(
    scope: VerifiedTenantScope,
    event: RecordActivity,
    database: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return database.activityEvent.create({
      data: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        actorMembershipId: scope.membershipId,
        actorType: event.actorType ?? ActivityActorType.USER,
        eventType: event.eventType,
        action: event.action,
        summary: event.summary,
        ...(event.resourceType ? { resourceType: event.resourceType } : {}),
        ...(event.resourceId ? { resourceId: event.resourceId } : {}),
        ...(event.metadata ? { metadata: event.metadata } : {}),
        ...(event.leadId ? { leadId: event.leadId } : {}),
        ...(event.conversationId
          ? { conversationId: event.conversationId }
          : {}),
        ...(event.followUpId ? { followUpId: event.followUpId } : {}),
        ...(event.workflowId ? { workflowId: event.workflowId } : {}),
        ...(event.approvalRequestId
          ? { approvalRequestId: event.approvalRequestId }
          : {}),
      },
    });
  }

  recordProvider(
    scope: ControlledActivityScope,
    event: RecordActivity,
    database: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return database.activityEvent.create({
      data: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        actorType: ActivityActorType.PROVIDER,
        eventType: event.eventType,
        action: event.action,
        summary: event.summary,
        ...(event.resourceType ? { resourceType: event.resourceType } : {}),
        ...(event.resourceId ? { resourceId: event.resourceId } : {}),
        ...(event.conversationId
          ? { conversationId: event.conversationId }
          : {}),
        ...(event.workflowId ? { workflowId: event.workflowId } : {}),
        ...(event.approvalRequestId
          ? { approvalRequestId: event.approvalRequestId }
          : {}),
      },
    });
  }

  recordSystem(
    scope: ControlledActivityScope,
    event: RecordActivity,
    database: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    return database.activityEvent.create({
      data: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
        actorType: ActivityActorType.SYSTEM,
        eventType: event.eventType,
        action: event.action,
        summary: event.summary,
        ...(event.resourceType ? { resourceType: event.resourceType } : {}),
        ...(event.resourceId ? { resourceId: event.resourceId } : {}),
        ...(event.conversationId
          ? { conversationId: event.conversationId }
          : {}),
        ...(event.workflowId ? { workflowId: event.workflowId } : {}),
        ...(event.approvalRequestId
          ? { approvalRequestId: event.approvalRequestId }
          : {}),
      },
    });
  }

  async list(
    scope: VerifiedTenantScope,
    query: ListActivityDto,
  ): Promise<ActivityListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const category =
      query.category && query.category !== "ALL"
        ? categoryEvents[query.category]
        : undefined;
    const search = query.search?.trim();
    const since = activityDateStart(query.dateRange);
    const where: Prisma.ActivityEventWhereInput = {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      ...(query.eventType
        ? { eventType: query.eventType }
        : category
          ? { eventType: { in: [...category] } }
          : {}),
      ...(query.actorType ? { actorType: query.actorType } : {}),
      ...(query.workflowId ? { workflowId: query.workflowId } : {}),
      ...(since ? { occurredAt: { gte: since } } : {}),
      ...(search
        ? {
            OR: [
              { action: { contains: search, mode: "insensitive" } },
              { summary: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.activityEvent.findMany({
        where,
        orderBy: { occurredAt: query.sort === "OLDEST" ? "asc" : "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorType: true,
          eventType: true,
          resourceType: true,
          resourceId: true,
          action: true,
          summary: true,
          occurredAt: true,
        },
      }),
      this.prisma.activityEvent.count({ where }),
    ]);
    return {
      items: items.map((item): ActivityRecord => ({
        ...item,
        occurredAt: item.occurredAt.toISOString(),
      })),
      page,
      limit,
      total,
    };
  }
}
