import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from "@nestjs/common";
import { CurrentTenant } from "../authorization/current-tenant.decorator.js";
import { Permissions } from "../authorization/permissions.js";
import { RequirePermission } from "../authorization/require-permission.decorator.js";
import type { VerifiedTenantScope } from "../tenancy/tenant-scope.js";
import { CommunicationDeliveryService } from "./communication-delivery.service.js";
import { SubmitOutboundMessageDto } from "./communication.dto.js";

@Controller("conversations")
export class CommunicationController {
  constructor(private readonly delivery: CommunicationDeliveryService) {}

  @Post(":conversationId/deliveries")
  @HttpCode(HttpStatus.ACCEPTED)
  @RequirePermission(Permissions.CONVERSATIONS_SEND)
  submit(
    @CurrentTenant() scope: VerifiedTenantScope,
    @Param("conversationId", new ParseUUIDPipe({ version: "4" }))
    conversationId: string,
    @Body() input: SubmitOutboundMessageDto,
  ) {
    return this.delivery.submit(scope, conversationId, input);
  }
}
