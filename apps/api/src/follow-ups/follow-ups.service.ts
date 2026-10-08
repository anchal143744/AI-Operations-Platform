import { Injectable } from "@nestjs/common";
import type {
  FollowUpListResponse,
  FollowUpRecord,
  FollowUpStatus,
  FollowUpSummary,
} from "@aop/types";
import {
  ActivityEventType,
  FollowUpState,
  type FollowUp,
  type Prisma,
} from "@prisma/client";
import { ActivityEventService } from "../activity/activity.service.js";
import { PrismaService } from "../database/prisma.service.js";
import {
  tenantOwnedWhere,
  type VerifiedTenantScope,
} from "../tenancy/tenant-scope.js";
import type {
  CreateFollowUpDto,
  ListFollowUpsDto,
  RescheduleFollowUpDto,
} from "./follow-ups.dto.js";
import {
  followUpContextNotFound,
  followUpNotFound,
  invalidFollowUp,
} from "./follow-ups.errors.js";

function utcDayBounds(now: Date) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  return { today, tomorrow };
}

function statusOf(followUp: FollowUp, now: Date): FollowUpStatus {
  if (followUp.state === FollowUpState.COMPLETED) return "COMPLETED";
  if (followUp.state === FollowUpState.CANCELLED) return "CANCELLED";
  if (!followUp.dueAt) return "PENDING";
  const { today, tomorrow } = utcDayBounds(now);
  if (followUp.dueAt < today) return "OVERDUE";
  if (followUp.dueAt < tomorrow) return "DUE";
  return "PENDING";
}

function present(followUp: FollowUp, now = new Date()): FollowUpRecord {
  return {
    id: followUp.id,
    leadId: followUp.leadId,
    conversationId: followUp.conversationId,
    title: followUp.title,
    description: followUp.description,
    type: followUp.type,
    status: statusOf(followUp, now),
    priority: followUp.priority,
    owner: null,
    dueAt: followUp.dueAt?.toISOString() ?? null,
    createdAt: followUp.createdAt.toISOString(),
    updatedAt: followUp.updatedAt.toISOString(),
    completedAt: followUp.completedAt?.toISOString() ?? null,
  };
}

function statusWhere(
  status: FollowUpStatus,
  now: Date,
): Prisma.FollowUpWhereInput {
  const { today, tomorrow } = utcDayBounds(now);
  switch (status) {
    case "COMPLETED":
      return { state: FollowUpState.COMPLETED };
    case "CANCELLED":
      return { state: FollowUpState.CANCELLED };
    case "OVERDUE":
      return { state: FollowUpState.PENDING, dueAt: { lt: today } };
    case "DUE":
      return {
        state: FollowUpState.PENDING,
        dueAt: { gte: today, lt: tomorrow },
      };
    case "PENDING":
      return {
        state: FollowUpState.PENDING,
        OR: [{ dueAt: null }, { dueAt: { gte: tomorrow } }],
      };
  }
}

function viewWhere(
  view: ListFollowUpsDto["view"] | ListFollowUpsDto["date"],
  now: Date,
): Prisma.FollowUpWhereInput | null {
  const { tomorrow } = utcDayBounds(now);
  switch (view) {
    case "DUE_TODAY":
      return statusWhere("DUE", now);
    case "OVERDUE":
      return statusWhere("OVERDUE", now);
    case "UPCOMING":
      return { state: FollowUpState.PENDING, dueAt: { gte: tomorrow } };
    case "COMPLETED":
      return { state: FollowUpState.COMPLETED };
    default:
      return null;
  }
}

function ordering(
  sort: ListFollowUpsDto["sort"],
): Prisma.FollowUpOrderByWithRelationInput[] {
  switch (sort) {
    case "DUE_LATEST":
      return [{ dueAt: { sort: "desc", nulls: "last" } }, { id: "desc" }];
    case "PRIORITY_HIGHEST":
      return [{ priority: "desc" }, { dueAt: "asc" }, { id: "asc" }];
    case "RECENTLY_CREATED":
      return [{ createdAt: "desc" }, { id: "desc" }];
    default:
      return [{ dueAt: { sort: "asc", nulls: "last" } }, { id: "asc" }];
  }
}

function futureDate(iso: string) {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) {
    throw invalidFollowUp("Choose a future follow-up date and time.");
  }
  return date;
}

@Injectable()
export class FollowUpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityEventService,
  ) {}

  async list(
    scope: VerifiedTenantScope,
    input: ListFollowUpsDto,
  ): Promise<FollowUpListResponse> {
    const now = new Date();
    const conditions: Prisma.FollowUpWhereInput[] = [];
    const view = viewWhere(input.view, now);
    if (view) conditions.push(view);
    const date = viewWhere(input.date, now);
    if (date) conditions.push(date);
    if (input.status?.length) {
      conditions.push({
        OR: input.status.map((status) => statusWhere(status, now)),
      });
    }
    const where: Prisma.FollowUpWhereInput = {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      ...(conditions.length ? { AND: conditions } : {}),
      ...(input.search
        ? { title: { contains: input.search, mode: "insensitive" } }
        : {}),
      ...(input.priority ? { priority: { in: input.priority } } : {}),
      ...(input.type ? { type: { in: input.type } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.followUp.findMany({
        where,
        orderBy: ordering(input.sort),
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.followUp.count({ where }),
    ]);
    return {
      items: items.map((item) => present(item, now)),
      total,
      page: input.page,
      limit: input.limit,
    };
  }

  async summary(scope: VerifiedTenantScope): Promise<FollowUpSummary> {
    const now = new Date();
    const base = {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
    };
    const [DUE_TODAY, UPCOMING, OVERDUE, COMPLETED] =
      await this.prisma.$transaction([
        this.prisma.followUp.count({
          where: { ...base, ...viewWhere("DUE_TODAY", now) },
        }),
        this.prisma.followUp.count({
          where: { ...base, ...viewWhere("UPCOMING", now) },
        }),
        this.prisma.followUp.count({
          where: { ...base, ...viewWhere("OVERDUE", now) },
        }),
        this.prisma.followUp.count({
          where: { ...base, state: FollowUpState.COMPLETED },
        }),
      ]);
    return { DUE_TODAY, UPCOMING, OVERDUE, COMPLETED };
  }

  async create(
    scope: VerifiedTenantScope,
    input: CreateFollowUpDto,
  ): Promise<FollowUpRecord> {
    const dueAt = futureDate(input.dueAt);
    const created = await this.prisma.$transaction(async (database) => {
      if (input.leadId) {
        const lead = await database.lead.findFirst({
          where: tenantOwnedWhere(scope, input.leadId),
          select: { id: true },
        });
        if (!lead) throw followUpContextNotFound();
      }
      let leadId = input.leadId;
      if (input.conversationId) {
        const conversation = await database.conversation.findFirst({
          where: tenantOwnedWhere(scope, input.conversationId),
          select: { leadId: true },
        });
        if (!conversation) throw followUpContextNotFound();
        if (leadId && conversation.leadId && conversation.leadId !== leadId) {
          throw invalidFollowUp(
            "The lead and conversation do not belong together.",
          );
        }
        leadId ??= conversation.leadId ?? undefined;
      }
      const followUp = await database.followUp.create({
        data: {
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
          title: input.title,
          description: input.description ?? null,
          type: input.type,
          priority: input.priority,
          dueAt,
          ...(leadId ? { leadId } : {}),
          ...(input.conversationId
            ? { conversationId: input.conversationId }
            : {}),
        },
      });
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.FOLLOW_UP_CREATED,
          action: "follow_up.created",
          summary: "A follow-up was scheduled.",
          resourceType: "FOLLOW_UP",
          resourceId: followUp.id,
          followUpId: followUp.id,
        },
        database,
      );
      return followUp;
    });
    return present(created);
  }

  async complete(
    scope: VerifiedTenantScope,
    id: string,
  ): Promise<FollowUpRecord> {
    const completed = await this.prisma.$transaction(async (database) => {
      const result = await database.followUp.updateMany({
        where: { ...tenantOwnedWhere(scope, id), state: FollowUpState.PENDING },
        data: { state: FollowUpState.COMPLETED, completedAt: new Date() },
      });
      if (!result.count) throw followUpNotFound();
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.FOLLOW_UP_COMPLETED,
          action: "follow_up.completed",
          summary: "A follow-up was marked complete.",
          resourceType: "FOLLOW_UP",
          resourceId: id,
          followUpId: id,
        },
        database,
      );
      return database.followUp.findFirstOrThrow({
        where: tenantOwnedWhere(scope, id),
      });
    });
    return present(completed);
  }

  async reschedule(
    scope: VerifiedTenantScope,
    id: string,
    input: RescheduleFollowUpDto,
  ): Promise<FollowUpRecord> {
    const dueAt = futureDate(input.dueAt);
    const changed = await this.prisma.$transaction(async (database) => {
      const result = await database.followUp.updateMany({
        where: { ...tenantOwnedWhere(scope, id), state: FollowUpState.PENDING },
        data: { dueAt },
      });
      if (!result.count) throw followUpNotFound();
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.FOLLOW_UP_RESCHEDULED,
          action: "follow_up.rescheduled",
          summary: "A follow-up was rescheduled.",
          resourceType: "FOLLOW_UP",
          resourceId: id,
          followUpId: id,
        },
        database,
      );
      return database.followUp.findFirstOrThrow({
        where: tenantOwnedWhere(scope, id),
      });
    });
    return present(changed);
  }
}
