-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "organization_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "workspace_status" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "membership_role" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'SALES', 'VIEWER');

-- CreateEnum
CREATE TYPE "membership_status" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "normalized_email" VARCHAR(320) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "email_verified_at" TIMESTAMPTZ(3),
    "status" "user_status" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "status" "organization_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "role" "membership_role" NOT NULL,
    "status" "membership_status" NOT NULL DEFAULT 'INVITED',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspaces" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "status" "workspace_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "lead_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "lead_id" UUID,
    "conversation_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_operations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "lead_id" UUID,
    "conversation_id" UUID,
    "follow_up_id" UUID,
    "workflow_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "ai_operation_id" UUID,
    "workflow_id" UUID,
    "lead_id" UUID,
    "conversation_id" UUID,
    "follow_up_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "actor_membership_id" UUID,
    "lead_id" UUID,
    "conversation_id" UUID,
    "follow_up_id" UUID,
    "ai_operation_id" UUID,
    "workflow_id" UUID,
    "approval_request_id" UUID,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workspace_settings" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workspace_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_normalized_email_key" ON "users"("normalized_email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_created_at_idx" ON "organizations"("created_at");

-- CreateIndex
CREATE INDEX "memberships_user_status_idx" ON "memberships"("user_id", "status");

-- CreateIndex
CREATE INDEX "memberships_organization_role_status_idx" ON "memberships"("organization_id", "role", "status");

-- CreateIndex
CREATE INDEX "memberships_created_at_idx" ON "memberships"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_user_organization_key" ON "memberships"("user_id", "organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_id_organization_key" ON "memberships"("id", "organization_id");

-- CreateIndex
CREATE INDEX "workspaces_organization_created_at_idx" ON "workspaces"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_organization_slug_key" ON "workspaces"("organization_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "workspaces_id_organization_key" ON "workspaces"("id", "organization_id");

-- CreateIndex
CREATE INDEX "leads_tenant_created_at_idx" ON "leads"("organization_id", "workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "leads_id_tenant_key" ON "leads"("id", "organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "conversations_tenant_created_at_idx" ON "conversations"("organization_id", "workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "conversations_tenant_lead_idx" ON "conversations"("organization_id", "workspace_id", "lead_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_id_tenant_key" ON "conversations"("id", "organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "follow_ups_tenant_created_at_idx" ON "follow_ups"("organization_id", "workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "follow_ups_tenant_lead_idx" ON "follow_ups"("organization_id", "workspace_id", "lead_id");

-- CreateIndex
CREATE INDEX "follow_ups_tenant_conversation_idx" ON "follow_ups"("organization_id", "workspace_id", "conversation_id");

-- CreateIndex
CREATE UNIQUE INDEX "follow_ups_id_tenant_key" ON "follow_ups"("id", "organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "workflows_tenant_created_at_idx" ON "workflows"("organization_id", "workspace_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_id_tenant_key" ON "workflows"("id", "organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "ai_operations_tenant_created_at_idx" ON "ai_operations"("organization_id", "workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_operations_tenant_lead_idx" ON "ai_operations"("organization_id", "workspace_id", "lead_id");

-- CreateIndex
CREATE INDEX "ai_operations_tenant_conversation_idx" ON "ai_operations"("organization_id", "workspace_id", "conversation_id");

-- CreateIndex
CREATE INDEX "ai_operations_tenant_follow_up_idx" ON "ai_operations"("organization_id", "workspace_id", "follow_up_id");

-- CreateIndex
CREATE INDEX "ai_operations_tenant_workflow_idx" ON "ai_operations"("organization_id", "workspace_id", "workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_operations_id_tenant_key" ON "ai_operations"("id", "organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "approval_requests_tenant_created_at_idx" ON "approval_requests"("organization_id", "workspace_id", "created_at");

-- CreateIndex
CREATE INDEX "approval_requests_tenant_ai_operation_idx" ON "approval_requests"("organization_id", "workspace_id", "ai_operation_id");

-- CreateIndex
CREATE INDEX "approval_requests_tenant_workflow_idx" ON "approval_requests"("organization_id", "workspace_id", "workflow_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_id_tenant_key" ON "approval_requests"("id", "organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "activity_events_tenant_occurred_at_idx" ON "activity_events"("organization_id", "workspace_id", "occurred_at");

-- CreateIndex
CREATE INDEX "activity_events_actor_occurred_at_idx" ON "activity_events"("organization_id", "actor_membership_id", "occurred_at");

-- CreateIndex
CREATE INDEX "workspace_settings_tenant_idx" ON "workspace_settings"("organization_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workspace_settings_workspace_key" ON "workspace_settings"("workspace_id", "organization_id");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lead_id_organization_id_workspace_id_fkey" FOREIGN KEY ("lead_id", "organization_id", "workspace_id") REFERENCES "leads"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_lead_id_organization_id_workspace_id_fkey" FOREIGN KEY ("lead_id", "organization_id", "workspace_id") REFERENCES "leads"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_conversation_id_organization_id_workspace_id_fkey" FOREIGN KEY ("conversation_id", "organization_id", "workspace_id") REFERENCES "conversations"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_operations" ADD CONSTRAINT "ai_operations_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_operations" ADD CONSTRAINT "ai_operations_lead_id_organization_id_workspace_id_fkey" FOREIGN KEY ("lead_id", "organization_id", "workspace_id") REFERENCES "leads"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_operations" ADD CONSTRAINT "ai_operations_conversation_id_organization_id_workspace_id_fkey" FOREIGN KEY ("conversation_id", "organization_id", "workspace_id") REFERENCES "conversations"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_operations" ADD CONSTRAINT "ai_operations_follow_up_id_organization_id_workspace_id_fkey" FOREIGN KEY ("follow_up_id", "organization_id", "workspace_id") REFERENCES "follow_ups"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_operations" ADD CONSTRAINT "ai_operations_workflow_id_organization_id_workspace_id_fkey" FOREIGN KEY ("workflow_id", "organization_id", "workspace_id") REFERENCES "workflows"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_ai_operation_id_organization_id_workspac_fkey" FOREIGN KEY ("ai_operation_id", "organization_id", "workspace_id") REFERENCES "ai_operations"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workflow_id_organization_id_workspace_id_fkey" FOREIGN KEY ("workflow_id", "organization_id", "workspace_id") REFERENCES "workflows"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_lead_id_organization_id_workspace_id_fkey" FOREIGN KEY ("lead_id", "organization_id", "workspace_id") REFERENCES "leads"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_conversation_id_organization_id_workspac_fkey" FOREIGN KEY ("conversation_id", "organization_id", "workspace_id") REFERENCES "conversations"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_follow_up_id_organization_id_workspace_i_fkey" FOREIGN KEY ("follow_up_id", "organization_id", "workspace_id") REFERENCES "follow_ups"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_actor_membership_id_organization_id_fkey" FOREIGN KEY ("actor_membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_lead_id_organization_id_workspace_id_fkey" FOREIGN KEY ("lead_id", "organization_id", "workspace_id") REFERENCES "leads"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_conversation_id_organization_id_workspace__fkey" FOREIGN KEY ("conversation_id", "organization_id", "workspace_id") REFERENCES "conversations"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_follow_up_id_organization_id_workspace_id_fkey" FOREIGN KEY ("follow_up_id", "organization_id", "workspace_id") REFERENCES "follow_ups"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_ai_operation_id_organization_id_workspace__fkey" FOREIGN KEY ("ai_operation_id", "organization_id", "workspace_id") REFERENCES "ai_operations"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workflow_id_organization_id_workspace_id_fkey" FOREIGN KEY ("workflow_id", "organization_id", "workspace_id") REFERENCES "workflows"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_approval_request_id_organization_id_worksp_fkey" FOREIGN KEY ("approval_request_id", "organization_id", "workspace_id") REFERENCES "approval_requests"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_settings" ADD CONSTRAINT "workspace_settings_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma does not currently represent these database-only invariants.
ALTER TABLE "users"
ADD CONSTRAINT "users_normalized_email_format_check"
CHECK ("normalized_email" = lower(btrim("normalized_email")));

ALTER TABLE "organizations"
ADD CONSTRAINT "organizations_slug_format_check"
CHECK ("slug" = lower("slug") AND "slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

ALTER TABLE "workspaces"
ADD CONSTRAINT "workspaces_slug_format_check"
CHECK ("slug" = lower("slug") AND "slug" ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

-- Activity is durable operational evidence. Normal application roles cannot
-- update or delete events; changing this invariant requires an explicit migration.
CREATE FUNCTION "prevent_activity_event_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'activity_events are append-only';
END;
$$;

CREATE TRIGGER "activity_events_append_only"
BEFORE UPDATE OR DELETE ON "activity_events"
FOR EACH ROW
EXECUTE FUNCTION "prevent_activity_event_mutation"();
