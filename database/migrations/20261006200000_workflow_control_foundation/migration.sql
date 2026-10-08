-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowTriggerType" AS ENUM ('MANUAL');

-- CreateEnum
CREATE TYPE "WorkflowActionType" AS ENUM ('DRY_RUN_LOG');

-- CreateEnum
CREATE TYPE "PolicyMode" AS ENUM ('ALLOW_DRY_RUN', 'REQUIRE_APPROVAL', 'BLOCK');

-- CreateEnum
CREATE TYPE "PolicyEvaluationResult" AS ENUM ('ALLOWED', 'APPROVAL_REQUIRED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('QUEUED', 'WAITING_FOR_APPROVAL', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ExecutionStepStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "activity_event_type" ADD VALUE 'WORKFLOW_CREATED';
ALTER TYPE "activity_event_type" ADD VALUE 'WORKFLOW_STATUS_CHANGED';
ALTER TYPE "activity_event_type" ADD VALUE 'POLICY_CHANGED';
ALTER TYPE "activity_event_type" ADD VALUE 'POLICY_EVALUATED';
ALTER TYPE "activity_event_type" ADD VALUE 'APPROVAL_DECIDED';
ALTER TYPE "activity_event_type" ADD VALUE 'WORKFLOW_EXECUTION_CHANGED';

-- AlterEnum
ALTER TYPE "outbox_event_type" ADD VALUE 'WORKFLOW_DRY_RUN';

-- AlterTable
ALTER TABLE "approval_requests" ADD COLUMN     "expires_at" TIMESTAMPTZ(3),
ADD COLUMN     "reason" VARCHAR(500),
ADD COLUMN     "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "workflow_execution_id" UUID;

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "workflow_execution_id" UUID;

-- AlterTable
ALTER TABLE "workflows" ADD COLUMN     "action_type" "WorkflowActionType" NOT NULL DEFAULT 'DRY_RUN_LOG',
ADD COLUMN     "description" VARCHAR(1000) NOT NULL DEFAULT '',
ADD COLUMN     "name" VARCHAR(160) NOT NULL DEFAULT 'Untitled workflow',
ADD COLUMN     "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "trigger_type" "WorkflowTriggerType" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "policies" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "mode" "PolicyMode" NOT NULL DEFAULT 'REQUIRE_APPROVAL',
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_executions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_evaluations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "result" "PolicyEvaluationResult" NOT NULL,
    "evaluated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_decisions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "actor_membership_id" UUID NOT NULL,
    "decision" "ApprovalStatus" NOT NULL,
    "note" VARCHAR(1000),
    "decided_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_steps" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "execution_id" UUID NOT NULL,
    "step_number" INTEGER NOT NULL,
    "action_type" "WorkflowActionType" NOT NULL,
    "status" "ExecutionStepStatus" NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "execution_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "policies_workflow_id_key" ON "policies"("workflow_id");

-- CreateIndex
CREATE INDEX "policies_tenant_updated_at_idx" ON "policies"("organization_id", "workspace_id", "updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "policies_id_tenant_key" ON "policies"("id", "organization_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "policies_workflow_tenant_key" ON "policies"("workflow_id", "organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "workflow_executions_tenant_status_created_at_idx" ON "workflow_executions"("organization_id", "workspace_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "workflow_executions_tenant_workflow_created_at_idx" ON "workflow_executions"("organization_id", "workspace_id", "workflow_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_executions_id_tenant_key" ON "workflow_executions"("id", "organization_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_executions_tenant_idempotency_key" ON "workflow_executions"("organization_id", "workspace_id", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "policy_evaluations_execution_id_key" ON "policy_evaluations"("execution_id");

-- CreateIndex
CREATE INDEX "policy_evaluations_tenant_evaluated_at_idx" ON "policy_evaluations"("organization_id", "workspace_id", "evaluated_at");

-- CreateIndex
CREATE UNIQUE INDEX "policy_evaluations_execution_tenant_key" ON "policy_evaluations"("execution_id", "organization_id", "workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_decisions_request_id_key" ON "approval_decisions"("request_id");

-- CreateIndex
CREATE INDEX "approval_decisions_tenant_decided_at_idx" ON "approval_decisions"("organization_id", "workspace_id", "decided_at");

-- CreateIndex
CREATE UNIQUE INDEX "approval_decisions_request_tenant_key" ON "approval_decisions"("request_id", "organization_id", "workspace_id");

-- CreateIndex
CREATE INDEX "execution_steps_tenant_execution_idx" ON "execution_steps"("organization_id", "workspace_id", "execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "execution_steps_execution_number_key" ON "execution_steps"("execution_id", "step_number");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_workflow_execution_id_key" ON "approval_requests"("workflow_execution_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_execution_tenant_key" ON "approval_requests"("workflow_execution_id", "organization_id", "workspace_id");

-- RenameForeignKey
ALTER TABLE "outbox_events" RENAME CONSTRAINT "outbox_events_message_fkey" TO "outbox_events_message_id_organization_id_workspace_id_fkey";

-- RenameForeignKey
ALTER TABLE "outbox_events" RENAME CONSTRAINT "outbox_events_workspace_fkey" TO "outbox_events_workspace_id_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "provider_configurations" RENAME CONSTRAINT "provider_configurations_workspace_fkey" TO "provider_configurations_workspace_id_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "provider_webhook_events" RENAME CONSTRAINT "provider_webhook_events_provider_configuration_fkey" TO "provider_webhook_events_provider_configuration_id_organiza_fkey";

-- RenameForeignKey
ALTER TABLE "provider_webhook_events" RENAME CONSTRAINT "provider_webhook_events_workspace_fkey" TO "provider_webhook_events_workspace_id_organization_id_fkey";

-- RenameForeignKey
ALTER TABLE "sessions" RENAME CONSTRAINT "sessions_active_workspace_fkey" TO "sessions_active_workspace_id_active_organization_id_fkey";

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_workflow_execution_id_organization_id_worksp_fkey" FOREIGN KEY ("workflow_execution_id", "organization_id", "workspace_id") REFERENCES "workflow_executions"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_workflow_execution_id_organization_id_wo_fkey" FOREIGN KEY ("workflow_execution_id", "organization_id", "workspace_id") REFERENCES "workflow_executions"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_workflow_id_organization_id_workspace_id_fkey" FOREIGN KEY ("workflow_id", "organization_id", "workspace_id") REFERENCES "workflows"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_workflow_id_organization_id_workspace__fkey" FOREIGN KEY ("workflow_id", "organization_id", "workspace_id") REFERENCES "workflows"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_evaluations" ADD CONSTRAINT "policy_evaluations_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_evaluations" ADD CONSTRAINT "policy_evaluations_policy_id_organization_id_workspace_id_fkey" FOREIGN KEY ("policy_id", "organization_id", "workspace_id") REFERENCES "policies"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_evaluations" ADD CONSTRAINT "policy_evaluations_execution_id_organization_id_workspace__fkey" FOREIGN KEY ("execution_id", "organization_id", "workspace_id") REFERENCES "workflow_executions"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_request_id_organization_id_workspace_id_fkey" FOREIGN KEY ("request_id", "organization_id", "workspace_id") REFERENCES "approval_requests"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_decisions" ADD CONSTRAINT "approval_decisions_actor_membership_id_organization_id_fkey" FOREIGN KEY ("actor_membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_workspace_id_organization_id_fkey" FOREIGN KEY ("workspace_id", "organization_id") REFERENCES "workspaces"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_execution_id_organization_id_workspace_id_fkey" FOREIGN KEY ("execution_id", "organization_id", "workspace_id") REFERENCES "workflow_executions"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;
