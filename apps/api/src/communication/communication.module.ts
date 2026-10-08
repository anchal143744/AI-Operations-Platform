import { Module } from "@nestjs/common";
import { ActivityModule } from "../activity/activity.module.js";
import { AuthorizationModule } from "../authorization/authorization.module.js";
import { DatabaseModule } from "../database/database.module.js";
import { OutboxModule } from "../outbox/outbox.module.js";
import { CommunicationController } from "./communication.controller.js";
import { CommunicationDeliveryService } from "./communication-delivery.service.js";
import { ProviderWebhookService } from "./provider-webhook.service.js";
import { ProvidersModule } from "./providers/providers.module.js";

@Module({
  imports: [
    DatabaseModule,
    AuthorizationModule,
    ActivityModule,
    ProvidersModule,
    OutboxModule,
  ],
  controllers: [CommunicationController],
  providers: [CommunicationDeliveryService, ProviderWebhookService],
  exports: [CommunicationDeliveryService, ProviderWebhookService],
})
export class CommunicationModule {}
