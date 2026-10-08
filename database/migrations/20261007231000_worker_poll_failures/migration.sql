-- Keep the already-applied heartbeat migration immutable. Repeated polling
-- failures must make a live-but-unproductive worker fail readiness.
ALTER TABLE "worker_heartbeats"
  ADD COLUMN "consecutive_errors" INTEGER NOT NULL DEFAULT 0;
