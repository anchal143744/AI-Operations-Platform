-- Extend the existing workflow/outbox/activity vocabularies for one internal-only action.
ALTER TYPE "WorkflowActionType" ADD VALUE 'INTERNAL_NOTIFICATION';
ALTER TYPE "activity_event_type" ADD VALUE 'NOTIFICATION_CREATED';
ALTER TYPE "activity_event_type" ADD VALUE 'NOTIFICATION_READ';
ALTER TYPE "outbox_event_type" ADD VALUE 'WORKFLOW_INTERNAL_NOTIFICATION';

-- Nullable to preserve historical dry-run executions. All new executions set this server-side.
ALTER TABLE "workflow_executions" ADD COLUMN "initiated_by_membership_id" UUID;

CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "recipient_membership_id" UUID NOT NULL,
    "workflow_execution_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMPTZ(3),
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notifications_workflow_execution_id_key" ON "notifications"("workflow_execution_id");
CREATE UNIQUE INDEX "notifications_id_tenant_key" ON "notifications"("id", "organization_id", "workspace_id");
CREATE UNIQUE INDEX "notifications_execution_tenant_key" ON "notifications"("workflow_execution_id", "organization_id", "workspace_id");
CREATE INDEX "notifications_recipient_created_at_idx" ON "notifications"("organization_id", "workspace_id", "recipient_membership_id", "created_at");
CREATE INDEX "notifications_recipient_read_at_idx" ON "notifications"("organization_id", "workspace_id", "recipient_membership_id", "read_at");
CREATE INDEX "workflow_executions_initiator_created_at_idx" ON "workflow_executions"("organization_id", "initiated_by_membership_id", "created_at");

ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_initiated_by_membership_id_organizatio_fkey" FOREIGN KEY ("initiated_by_membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_membership_id_organization_id_fkey" FOREIGN KEY ("recipient_membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workflow_execution_id_organization_id_worksp_fkey" FOREIGN KEY ("workflow_execution_id", "organization_id", "workspace_id") REFERENCES "workflow_executions"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;
