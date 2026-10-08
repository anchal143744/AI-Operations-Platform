import { Injectable } from "@nestjs/common";
import type {
  LeadListResponse,
  LeadRecord,
  LeadStatusTotals,
} from "@aop/types";
import {
  ActivityEventType,
  LeadStatus,
  type Lead,
  type Prisma,
} from "@prisma/client";
import { ActivityEventService } from "../activity/activity.service.js";
import { PrismaService } from "../database/prisma.service.js";
import {
  tenantOwnedWhere,
  type VerifiedTenantScope,
} from "../tenancy/tenant-scope.js";
import type {
  CreateLeadDto,
  ListLeadsDto,
  UpdateLeadDto,
} from "./leads.dto.js";
import { emptyLeadUpdate, leadNotFound } from "./leads.errors.js";

function present(lead: Lead): LeadRecord {
  return {
    id: lead.id,
    name: lead.name,
    company: lead.company,
    email: lead.email,
    phone: lead.phone,
    status: lead.status,
    priority: lead.priority,
    source: lead.source,
    owner: null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    lastActivityAt: null,
    nextFollowUpAt: null,
  };
}

function ordering(
  sort: ListLeadsDto["sort"],
): Prisma.LeadOrderByWithRelationInput[] {
  switch (sort) {
    case "OLDEST":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "RECENTLY_UPDATED":
      return [{ updatedAt: "desc" }, { id: "desc" }];
    case "PRIORITY":
      return [{ priority: "desc" }, { createdAt: "desc" }, { id: "desc" }];
    default:
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityEventService,
  ) {}

  async list(
    scope: VerifiedTenantScope,
    input: ListLeadsDto,
  ): Promise<LeadListResponse> {
    const where: Prisma.LeadWhereInput = {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      ...(input.status ? { status: { in: input.status } } : {}),
      ...(input.priority ? { priority: { in: input.priority } } : {}),
      ...(input.source ? { source: { in: input.source } } : {}),
      ...(input.search
        ? {
            OR: [
              {
                name: { contains: input.search, mode: "insensitive" as const },
              },
              {
                company: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: { contains: input.search, mode: "insensitive" as const },
              },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        orderBy: ordering(input.sort),
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return {
      items: items.map(present),
      page: input.page,
      limit: input.limit,
      total,
    };
  }

  async summary(scope: VerifiedTenantScope): Promise<LeadStatusTotals> {
    const rows = await this.prisma.lead.groupBy({
      by: ["status"],
      where: {
        organizationId: scope.organizationId,
        workspaceId: scope.workspaceId,
      },
      _count: { _all: true },
    });
    const totals: Record<LeadStatus, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      IN_PROGRESS: 0,
      CONVERTED: 0,
      LOST: 0,
    };
    for (const row of rows) totals[row.status] = row._count._all;
    return totals;
  }

  async get(scope: VerifiedTenantScope, leadId: string): Promise<LeadRecord> {
    const lead = await this.prisma.lead.findFirst({
      where: tenantOwnedWhere(scope, leadId),
    });
    if (!lead) throw leadNotFound();
    return present(lead);
  }

  async create(
    scope: VerifiedTenantScope,
    input: CreateLeadDto,
  ): Promise<LeadRecord> {
    const lead = await this.prisma.$transaction(async (database) => {
      const created = await database.lead.create({
        data: {
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
          createdByMembershipId: scope.membershipId,
          name: input.name,
          ...(input.company !== undefined ? { company: input.company } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
        },
      });
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.LEAD_CREATED,
          action: "lead.created",
          summary: "A lead was created.",
          resourceType: "LEAD",
          resourceId: created.id,
          leadId: created.id,
        },
        database,
      );
      return created;
    });
    return present(lead);
  }

  async update(
    scope: VerifiedTenantScope,
    leadId: string,
    input: UpdateLeadDto,
  ): Promise<LeadRecord> {
    if (Object.keys(input).length === 0) throw emptyLeadUpdate();
    const lead = await this.prisma.$transaction(async (database) => {
      const changed = await database.lead.updateMany({
        where: tenantOwnedWhere(scope, leadId),
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.company !== undefined ? { company: input.company } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
          ...(input.phone !== undefined ? { phone: input.phone } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.source !== undefined ? { source: input.source } : {}),
        },
      });
      if (changed.count === 0) throw leadNotFound();
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.LEAD_UPDATED,
          action: "lead.updated",
          summary: "A lead was updated.",
          resourceType: "LEAD",
          resourceId: leadId,
          leadId,
        },
        database,
      );
      return database.lead.findFirstOrThrow({
        where: tenantOwnedWhere(scope, leadId),
      });
    });
    return present(lead);
  }
}
