-- Current mutable workflow rows remain the editing surface. New executions pin
-- an append-only snapshot; pre-migration executions remain explicitly unpinned
-- because their historical definition cannot be reconstructed truthfully.
ALTER TYPE "activity_event_type" ADD VALUE 'WORKFLOW_DEFINITION_CHANGED';
ALTER TABLE "workflows" ADD COLUMN "current_version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "workflow_executions" ADD COLUMN "definition_version_id" UUID;

CREATE TABLE "workflow_definition_versions" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "workflow_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(1000) NOT NULL,
    "trigger_type" "WorkflowTriggerType" NOT NULL,
    "action_type" "WorkflowActionType" NOT NULL,
    "policy_mode" "PolicyMode" NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workflow_definition_versions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "workflow_definition_versions_positive_version" CHECK ("version" > 0)
);

CREATE UNIQUE INDEX "workflow_definition_versions_id_tenant_key" ON "workflow_definition_versions"("id", "organization_id", "workspace_id");
CREATE UNIQUE INDEX "workflow_definition_versions_number_key" ON "workflow_definition_versions"("workflow_id", "version");
CREATE INDEX "workflow_definition_versions_tenant_version_idx" ON "workflow_definition_versions"("organization_id", "workspace_id", "workflow_id", "version");
CREATE INDEX "workflow_executions_definition_version_idx" ON "workflow_executions"("organization_id", "workspace_id", "definition_version_id");

ALTER TABLE "workflow_definition_versions" ADD CONSTRAINT "workflow_definition_versions_workflow_fkey"
  FOREIGN KEY ("workflow_id", "organization_id", "workspace_id")
  REFERENCES "workflows"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workflow_executions" ADD CONSTRAINT "workflow_executions_definition_version_fkey"
  FOREIGN KEY ("definition_version_id", "organization_id", "workspace_id")
  REFERENCES "workflow_definition_versions"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- This is a snapshot of the current definition only, not a reconstructed past.
INSERT INTO "workflow_definition_versions" (
  "id", "organization_id", "workspace_id", "workflow_id", "version", "name", "description",
  "trigger_type", "action_type", "policy_mode", "policy_version", "created_at"
)
SELECT gen_random_uuid(), w."organization_id", w."workspace_id", w."id", 1,
       w."name", w."description", w."trigger_type", w."action_type",
       p."mode", p."version", CURRENT_TIMESTAMP
FROM "workflows" w JOIN "policies" p ON p."workflow_id" = w."id"
  AND p."organization_id" = w."organization_id" AND p."workspace_id" = w."workspace_id";

CREATE FUNCTION reject_workflow_definition_version_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Workflow definition versions are append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER workflow_definition_versions_immutable
  BEFORE UPDATE OR DELETE ON "workflow_definition_versions"
  FOR EACH ROW EXECUTE FUNCTION reject_workflow_definition_version_mutation();
