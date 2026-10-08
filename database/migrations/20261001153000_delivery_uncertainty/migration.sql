-- A non-idempotent provider can accept a request whose response is lost.
-- Preserve that distinction in append-only activity rather than claiming failure or delivery.
ALTER TYPE "activity_event_type" ADD VALUE IF NOT EXISTS 'MESSAGE_DELIVERY_UNCERTAIN';
