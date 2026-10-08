-- Existing tenant-scoped scaffold rows remain intact. Nullable operational
-- fields expose their incomplete legacy state rather than inventing data.
CREATE TYPE "follow_up_type" AS ENUM ('CALL', 'EMAIL', 'MESSAGE', 'MEETING', 'TASK', 'OTHER');
CREATE TYPE "follow_up_state" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

ALTER TYPE "activity_event_type" ADD VALUE 'FOLLOW_UP_CREATED';
ALTER TYPE "activity_event_type" ADD VALUE 'FOLLOW_UP_COMPLETED';
ALTER TYPE "activity_event_type" ADD VALUE 'FOLLOW_UP_RESCHEDULED';

ALTER TABLE "follow_ups"
  ADD COLUMN "title" VARCHAR(160),
  ADD COLUMN "description" VARCHAR(2000),
  ADD COLUMN "type" "follow_up_type",
  ADD COLUMN "state" "follow_up_state" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "priority" "lead_priority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "due_at" TIMESTAMPTZ(3),
  ADD COLUMN "completed_at" TIMESTAMPTZ(3);

CREATE INDEX "follow_ups_tenant_state_due_at_idx"
  ON "follow_ups"("organization_id", "workspace_id", "state", "due_at");
