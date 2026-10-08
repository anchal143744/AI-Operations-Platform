BEGIN;

CREATE TYPE "activity_actor_type" AS ENUM ('USER', 'SYSTEM', 'AI', 'PROVIDER');
CREATE TYPE "activity_event_type" AS ENUM (
  'USER_LOGIN', 'USER_LOGOUT', 'ORGANIZATION_CREATED', 'WORKSPACE_CREATED',
  'WORKSPACE_SELECTED', 'LEAD_CREATED', 'LEAD_UPDATED',
  'CONVERSATION_CREATED', 'MESSAGE_RECORDED'
);

ALTER TABLE "sessions"
  ADD COLUMN "active_organization_id" UUID,
  ADD COLUMN "active_workspace_id" UUID,
  ADD CONSTRAINT "sessions_active_workspace_pair_check"
    CHECK (("active_organization_id" IS NULL AND "active_workspace_id" IS NULL)
      OR ("active_organization_id" IS NOT NULL AND "active_workspace_id" IS NOT NULL)),
  ADD CONSTRAINT "sessions_active_workspace_fkey"
    FOREIGN KEY ("active_workspace_id", "active_organization_id")
    REFERENCES "workspaces"("id", "organization_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "sessions_active_workspace_idx"
  ON "sessions"("active_organization_id", "active_workspace_id");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "activity_events" LIMIT 1) THEN
    RAISE EXCEPTION 'Phase 26 requires an explicit ActivityEvent semantic backfill before migration';
  END IF;
END $$;

ALTER TABLE "activity_events"
  ADD COLUMN "actor_type" "activity_actor_type" NOT NULL,
  ADD COLUMN "event_type" "activity_event_type" NOT NULL,
  ADD COLUMN "resource_type" VARCHAR(80),
  ADD COLUMN "resource_id" UUID,
  ADD COLUMN "action" VARCHAR(120) NOT NULL,
  ADD COLUMN "summary" VARCHAR(500) NOT NULL,
  ADD COLUMN "metadata" JSONB;

CREATE INDEX "activity_events_tenant_type_occurred_at_idx"
  ON "activity_events"("organization_id", "workspace_id", "event_type", "occurred_at");
CREATE INDEX "activity_events_tenant_resource_idx"
  ON "activity_events"("organization_id", "workspace_id", "resource_type", "resource_id");

COMMIT;
