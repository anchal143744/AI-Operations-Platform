-- Process liveness metadata only. A crash leaves a row that becomes stale.
CREATE TABLE "worker_heartbeats" (
    "instance_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "heartbeat_at" TIMESTAMPTZ(3) NOT NULL,
    "in_flight_since" TIMESTAMPTZ(3),
    "stopped_at" TIMESTAMPTZ(3),
    CONSTRAINT "worker_heartbeats_pkey" PRIMARY KEY ("instance_id")
);

CREATE INDEX "worker_heartbeats_liveness_idx"
    ON "worker_heartbeats"("stopped_at", "heartbeat_at");
