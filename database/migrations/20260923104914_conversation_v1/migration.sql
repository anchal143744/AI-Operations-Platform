BEGIN;

/*
  Warnings:

  - Added the required column `channel` to the `conversations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `participant_name` to the `conversations` table without a default value. This is not possible if the table is not empty.

*/
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "conversations") THEN
    RAISE EXCEPTION 'conversation_v1 requires an explicit data backfill before migrating existing conversation rows';
  END IF;
END $$;

-- CreateEnum
CREATE TYPE "conversation_channel" AS ENUM ('WHATSAPP', 'INSTAGRAM', 'EMAIL', 'PHONE', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "conversation_status" AS ENUM ('OPEN', 'WAITING', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "conversation_attention_state" AS ENUM ('NONE', 'HUMAN_REQUIRED', 'AI_REVIEW_REQUIRED', 'FOLLOW_UP_DUE');

-- CreateEnum
CREATE TYPE "message_direction" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "message_sender_type" AS ENUM ('CUSTOMER', 'HUMAN', 'AI');

-- CreateEnum
CREATE TYPE "message_status" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "attention_state" "conversation_attention_state" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "channel" "conversation_channel" NOT NULL,
ADD COLUMN     "created_by_membership_id" UUID,
ADD COLUMN     "last_message_at" TIMESTAMPTZ(3),
ADD COLUMN     "participant_company" VARCHAR(160),
ADD COLUMN     "participant_name" VARCHAR(160) NOT NULL,
ADD COLUMN     "status" "conversation_status" NOT NULL DEFAULT 'OPEN',
ADD COLUMN     "subject" VARCHAR(200),
ADD COLUMN     "unread_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "sender_membership_id" UUID,
    "direction" "message_direction" NOT NULL,
    "sender_type" "message_sender_type" NOT NULL,
    "content" VARCHAR(10000) NOT NULL,
    "status" "message_status" NOT NULL DEFAULT 'SENT',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_tenant_conversation_created_at_idx" ON "messages"("organization_id", "workspace_id", "conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "messages_tenant_sender_idx" ON "messages"("organization_id", "sender_membership_id");

-- CreateIndex
CREATE INDEX "conversations_tenant_status_updated_at_idx" ON "conversations"("organization_id", "workspace_id", "status", "updated_at");

-- CreateIndex
CREATE INDEX "conversations_tenant_creator_idx" ON "conversations"("organization_id", "created_by_membership_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_membership_id_organization_id_fkey" FOREIGN KEY ("created_by_membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_organization_id_workspace_id_fkey" FOREIGN KEY ("conversation_id", "organization_id", "workspace_id") REFERENCES "conversations"("id", "organization_id", "workspace_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_membership_id_organization_id_fkey" FOREIGN KEY ("sender_membership_id", "organization_id") REFERENCES "memberships"("id", "organization_id") ON DELETE RESTRICT ON UPDATE CASCADE;

COMMIT;
