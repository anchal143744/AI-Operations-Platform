-- Phase 20 Lead rows contained ownership only. They cannot be given a
-- truthful name automatically. Abort without partial changes if any exist;
-- a reviewed backfill is required before deploying this migration there.
BEGIN;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "leads") THEN
    RAISE EXCEPTION 'Lead V1 migration requires a reviewed backfill for existing foundation rows';
  END IF;
END
$$;
-- CreateEnum
CREATE TYPE "lead_status" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'IN_PROGRESS', 'CONVERTED', 'LOST');

-- CreateEnum
CREATE TYPE "lead_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "lead_source" AS ENUM ('WEBSITE', 'WHATSAPP', 'EMAIL', 'INSTAGRAM', 'PHONE', 'MANUAL', 'OTHER');

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "company" VARCHAR(160),
ADD COLUMN     "created_by_membership_id" UUID,
ADD COLUMN     "email" VARCHAR(320),
ADD COLUMN     "name" VARCHAR(160) NOT NULL,
ADD COLUMN     "phone" VARCHAR(40),
ADD COLUMN     "priority" "lead_priority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "source" "lead_source" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "status" "lead_status" NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "leads_tenant_status_created_at_idx" ON "leads"("organization_id", "workspace_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "leads_tenant_creator_idx" ON "leads"("organization_id", "created_by_membership_id");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_created_by_membership_id_organization_id_fkey" FOREIGN KEY ("created_by_membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
