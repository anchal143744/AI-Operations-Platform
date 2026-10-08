-- Atomic, shared authentication counters across API processes. The key is a
-- keyed digest of endpoint plus IP/account context, never raw PII or tokens.
CREATE TABLE "auth_rate_limit_buckets" (
  "key_hash" VARCHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL,
  "reset_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "auth_rate_limit_buckets_pkey" PRIMARY KEY ("key_hash"),
  CONSTRAINT "auth_rate_limit_buckets_attempts_positive" CHECK ("attempts" > 0)
);

CREATE INDEX "auth_rate_limit_buckets_reset_at_idx"
  ON "auth_rate_limit_buckets"("reset_at");
