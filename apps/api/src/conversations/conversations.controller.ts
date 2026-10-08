import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentTenant } from "../authorization/current-tenant.decorator.js";
import { Permissions } from "../authorization/permissions.js";
import { RequirePermission } from "../authorization/require-permission.decorator.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import {
  CreateConversationDto,
  CreateMessageDto,
  ListConversationsDto,
} from "./conversations.dto.js";
import { ConversationsService } from "./conversations.service.js";

@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversations: ConversationsService) {}

  @Get()
  @RequirePermission(Permissions.CONVERSATIONS_READ)
  list(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Query() query: ListConversationsDto,
  ) {
    return this.conversations.list(scope, query);
  }

  @Get(":conversationId")
  @RequirePermission(Permissions.CONVERSATIONS_READ)
  get(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("conversationId", new ParseUUIDPipe({ version: "4" }))
    conversationId: string,
  ) {
    return this.conversations.get(scope, conversationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permissions.CONVERSATIONS_SEND)
  create(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Body() input: CreateConversationDto,
  ) {
    return this.conversations.create(scope, input);
  }

  @Post(":conversationId/messages")
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(Permissions.CONVERSATIONS_SEND)
  createMessage(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("conversationId", new ParseUUIDPipe({ version: "4" }))
    conversationId: string,
    @Body() input: CreateMessageDto,
  ) {
    return this.conversations.createMessage(scope, conversationId, input);
  }
}
