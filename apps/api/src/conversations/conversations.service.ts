import { Injectable } from "@nestjs/common";
import type {
  ConversationDetailResponse,
  ConversationListResponse,
  ConversationMessageRecord,
  ConversationRecord,
  LeadRecord,
} from "@aop/types";
import {
  ActivityEventType,
  MessageDirection,
  MessageSenderType,
  MessageStatus,
  type Conversation,
  type Lead,
  type Message,
  type Prisma,
} from "@prisma/client";
import { ActivityEventService } from "../activity/activity.service.js";
import { PrismaService } from "../database/prisma.service.js";
import {
  tenantOwnedWhere,
  type VerifiedTenantScope,
} from "../tenancy/tenant-scope.js";
import type {
  CreateConversationDto,
  CreateMessageDto,
  ListConversationsDto,
} from "./conversations.dto.js";
import {
  conversationLeadNotFound,
  conversationNotFound,
} from "./conversations.errors.js";

function presentConversation(
  conversation: Conversation & { messages?: Message[] },
): ConversationRecord {
  const latest = conversation.messages?.[0];
  return {
    id: conversation.id,
    leadId: conversation.leadId,
    channel: conversation.channel,
    status: conversation.status,
    attentionState: conversation.attentionState,
    subject: conversation.subject,
    participantName: conversation.participantName,
    participantCompany: conversation.participantCompany,
    owner: null,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
    unreadCount: conversation.unreadCount,
    ...(latest ? { lastMessagePreview: latest.content.slice(0, 160) } : {}),
  };
}

function presentMessage(message: Message): ConversationMessageRecord {
  return {
    id: message.id,
    conversationId: message.conversationId,
    direction: message.direction,
    senderType: message.senderType,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    status: message.status,
  };
}

function presentLead(lead: Lead): LeadRecord {
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

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityEventService,
  ) {}

  async list(
    scope: VerifiedTenantScope,
    input: ListConversationsDto,
  ): Promise<ConversationListResponse> {
    const searchIsUuid = Boolean(
      input.search &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.search,
      ),
    );
    const where: Prisma.ConversationWhereInput = {
      organizationId: scope.organizationId,
      workspaceId: scope.workspaceId,
      ...(input.status ? { status: input.status } : {}),
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.leadId ? { leadId: input.leadId } : {}),
      ...(input.search
        ? {
            OR: [
              {
                participantName: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
              {
                participantCompany: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
              {
                subject: {
                  contains: input.search,
                  mode: "insensitive" as const,
                },
              },
              ...(searchIsUuid ? [{ id: { equals: input.search } }] : []),
            ],
          }
        : {}),
    };
    const direction = input.sort === "OLDEST_ACTIVITY" ? "asc" : "desc";
    const [items, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: [{ updatedAt: direction }, { id: direction }],
        skip: (input.page - 1) * input.limit,
        take: input.limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);
    return {
      items: items.map(presentConversation),
      page: input.page,
      limit: input.limit,
      total,
    };
  }

  async get(
    scope: VerifiedTenantScope,
    conversationId: string,
  ): Promise<ConversationDetailResponse> {
    const conversation = await this.prisma.conversation.findFirst({
      where: tenantOwnedWhere(scope, conversationId),
      include: {
        messages: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] },
        lead: true,
      },
    });
    if (!conversation) throw conversationNotFound();
    return {
      conversation: presentConversation(conversation),
      messages: conversation.messages.map(presentMessage),
      lead: conversation.lead ? presentLead(conversation.lead) : null,
    };
  }

  async create(
    scope: VerifiedTenantScope,
    input: CreateConversationDto,
  ): Promise<ConversationRecord> {
    if (input.leadId) {
      const lead = await this.prisma.lead.findFirst({
        where: tenantOwnedWhere(scope, input.leadId),
        select: { id: true },
      });
      if (!lead) throw conversationLeadNotFound();
    }
    const conversation = await this.prisma.$transaction(async (database) => {
      const created = await database.conversation.create({
        data: {
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
          createdByMembershipId: scope.membershipId,
          participantName: input.participantName,
          channel: input.channel,
          ...(input.participantCompany !== undefined
            ? { participantCompany: input.participantCompany }
            : {}),
          ...(input.subject !== undefined ? { subject: input.subject } : {}),
          ...(input.leadId !== undefined ? { leadId: input.leadId } : {}),
        },
      });
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.CONVERSATION_CREATED,
          action: "conversation.created",
          summary: "A conversation was created.",
          resourceType: "CONVERSATION",
          resourceId: created.id,
          conversationId: created.id,
        },
        database,
      );
      return created;
    });
    return presentConversation(conversation);
  }

  async createMessage(
    scope: VerifiedTenantScope,
    conversationId: string,
    input: CreateMessageDto,
  ): Promise<ConversationMessageRecord> {
    const conversation = await this.prisma.conversation.findFirst({
      where: tenantOwnedWhere(scope, conversationId),
      select: { id: true, channel: true },
    });
    if (!conversation) throw conversationNotFound();
    const createdAt = new Date();
    const message = await this.prisma.$transaction(async (database) => {
      const record = await database.message.create({
        data: {
          organizationId: scope.organizationId,
          workspaceId: scope.workspaceId,
          conversationId,
          senderMembershipId: scope.membershipId,
          direction: MessageDirection.OUTBOUND,
          senderType: MessageSenderType.HUMAN,
          status: MessageStatus.DRAFT,
          channel: conversation.channel,
          content: input.content,
          createdAt,
        },
      });
      await database.conversation.updateMany({
        where: tenantOwnedWhere(scope, conversationId),
        data: { lastMessageAt: createdAt },
      });
      await this.activity.recordUser(
        scope,
        {
          eventType: ActivityEventType.MESSAGE_RECORDED,
          action: "message.recorded",
          summary: "An internal outbound message was recorded.",
          resourceType: "MESSAGE",
          resourceId: record.id,
          conversationId,
        },
        database,
      );
      return record;
    });
    return presentMessage(message);
  }
}
