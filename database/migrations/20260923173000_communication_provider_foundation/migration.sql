-- Phase 27: provider-neutral communication persistence. No provider secrets are stored.
ALTER TYPE "conversation_channel" ADD VALUE IF NOT EXISTS 'SMS';
ALTER TYPE "conversation_channel" ADD VALUE IF NOT EXISTS 'WEB_CHAT';

ALTER TYPE "message_status" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "message_status" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "message_status" ADD VALUE IF NOT EXISTS 'PROVIDER_ACCEPTED';
ALTER TYPE "message_status" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "message_status" ADD VALUE IF NOT EXISTS 'READ';
ALTER TYPE "message_status" ADD VALUE IF NOT EXISTS 'CANCELLED';

CREATE TYPE "communication_provider" AS ENUM ('TEST');
CREATE TYPE "provider_configuration_status" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "provider_webhook_event_type" AS ENUM ('MESSAGE_ACCEPTED', 'MESSAGE_DELIVERED', 'MESSAGE_READ', 'MESSAGE_FAILED', 'MESSAGE_RECEIVED');

ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'MESSAGE_SUBMITTED';
ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'MESSAGE_DELIVERY_ACCEPTED';
ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'MESSAGE_DELIVERED';
ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'MESSAGE_FAILED';
ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'WEBHOOK_RECEIVED';

ALTER TABLE "messages"
  ADD COLUMN "channel" "conversation_channel",
  ADD COLUMN "provider" "communication_provider",
  ADD COLUMN "provider_message_id" VARCHAR(200),
  ADD COLUMN "idempotency_key" VARCHAR(200),
  ADD COLUMN "submitted_at" TIMESTAMPTZ(3),
  ADD COLUMN "delivered_at" TIMESTAMPTZ(3),
  ADD COLUMN "failed_at" TIMESTAMPTZ(3),
  ADD COLUMN "failure_code" VARCHAR(120);

UPDATE "messages" AS message
SET "channel" = conversation."channel"
FROM "conversations" AS conversation
WHERE message."conversation_id" = conversation."id"
  AND message."organization_id" = conversation."organization_id"
  AND message."workspace_id" = conversation."workspace_id";

CREATE UNIQUE INDEX "messages_tenant_idempotency_key" ON "messages"("organization_id", "workspace_id", "idempotency_key");
CREATE INDEX "messages_tenant_provider_message_idx" ON "messages"("organization_id", "workspace_id", "provider", "provider_message_id");

CREATE TABLE "provider_configurations" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "channel" "conversation_channel" NOT NULL,
  "provider" "communication_provider" NOT NULL,
  "status" "provider_configuration_status" NOT NULL DEFAULT 'INACTIVE',
  "public_reference" VARCHAR(120) NOT NULL,
  "configuration_reference" VARCHAR(240),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "provider_configurations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "provider_configurations_workspace_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "provider_configurations_public_reference_key" ON "provider_configurations"("public_reference");
CREATE UNIQUE INDEX "provider_configurations_tenant_channel_provider_key" ON "provider_configurations"("organization_id", "workspace_id", "channel", "provider");
CREATE UNIQUE INDEX "provider_configurations_id_tenant_key" ON "provider_configurations"("id", "organization_id", "workspace_id");
CREATE INDEX "provider_configurations_tenant_status_idx" ON "provider_configurations"("organization_id", "workspace_id", "status");

CREATE TABLE "provider_webhook_events" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "provider_configuration_id" UUID NOT NULL,
  "provider_event_id" VARCHAR(200) NOT NULL,
  "event_type" "provider_webhook_event_type" NOT NULL,
  "received_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "provider_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "provider_webhook_events_workspace_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "provider_webhook_events_provider_configuration_fkey" FOREIGN KEY ("provider_configuration_id", "organization_id", "workspace_id") REFERENCES "provider_configurations"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "provider_webhook_events_provider_event_key" ON "provider_webhook_events"("provider_configuration_id", "provider_event_id");
CREATE INDEX "provider_webhook_events_tenant_received_at_idx" ON "provider_webhook_events"("organization_id", "workspace_id", "received_at");
