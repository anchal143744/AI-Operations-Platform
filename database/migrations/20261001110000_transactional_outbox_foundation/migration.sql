-- Phase 28: durable transactional outbox and worker recovery state.
CREATE TYPE "outbox_event_type" AS ENUM ('SEND_MESSAGE');
CREATE TYPE "outbox_event_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'MESSAGE_QUEUED';

CREATE UNIQUE INDEX "messages_id_tenant_key"
  ON "messages"("id", "organization_id", "workspace_id");

CREATE TABLE "outbox_events" (
  "id" UUID NOT NULL,
  "organization_id" UUID NOT NULL,
  "workspace_id" UUID NOT NULL,
  "message_id" UUID,
  "event_type" "outbox_event_type" NOT NULL,
  "status" "outbox_event_status" NOT NULL DEFAULT 'PENDING',
  "idempotency_key" VARCHAR(200) NOT NULL,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_at" TIMESTAMPTZ(3),
  "lock_token" UUID,
  "last_error_code" VARCHAR(120),
  "completed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_events_attempts_check" CHECK ("attempts" >= 0 AND "max_attempts" BETWEEN 1 AND 10),
  CONSTRAINT "outbox_events_workspace_fkey"
    FOREIGN KEY ("workspace_id", "organization_id")
    REFERENCES "workspaces"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "outbox_events_message_fkey"
    FOREIGN KEY ("message_id", "organization_id", "workspace_id")
    REFERENCES "messages"("id", "organization_id", "workspace_id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "outbox_events_tenant_type_idempotency_key"
  ON "outbox_events"("organization_id", "workspace_id", "event_type", "idempotency_key");
CREATE INDEX "outbox_events_dispatch_idx"
  ON "outbox_events"("status", "next_attempt_at", "created_at");
CREATE INDEX "outbox_events_tenant_created_at_idx"
  ON "outbox_events"("organization_id", "workspace_id", "created_at");
