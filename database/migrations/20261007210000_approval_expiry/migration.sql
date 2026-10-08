ALTER TYPE "activity_event_type" ADD VALUE 'APPROVAL_EXPIRED';

CREATE INDEX "approval_requests_expiry_idx" ON "approval_requests"("status", "expires_at");
