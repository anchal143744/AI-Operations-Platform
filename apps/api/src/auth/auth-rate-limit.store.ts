import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../database/prisma.service.js";

/** PostgreSQL is already required for auth; an atomic upsert shares the limit
 * across API processes without a second cache or a local-security fallback. */
@Injectable()
export class AuthRateLimitStore {
  private lastPruneAt = 0;

  constructor(private readonly prisma: PrismaService) {}

  async consume(keyHash: string, windowMs: number): Promise<number> {
    const rows = await this.prisma.$queryRaw<{ attempts: number }[]>(Prisma.sql`
      INSERT INTO "auth_rate_limit_buckets"
        ("key_hash", "attempts", "reset_at", "updated_at")
      VALUES (${keyHash}, 1, NOW() + (${windowMs} * INTERVAL '1 millisecond'), NOW())
      ON CONFLICT ("key_hash") DO UPDATE SET
        "attempts" = CASE
          WHEN "auth_rate_limit_buckets"."reset_at" <= NOW() THEN 1
          ELSE "auth_rate_limit_buckets"."attempts" + 1
        END,
        "reset_at" = CASE
          WHEN "auth_rate_limit_buckets"."reset_at" <= NOW() THEN EXCLUDED."reset_at"
          ELSE "auth_rate_limit_buckets"."reset_at"
        END,
        "updated_at" = NOW()
      RETURNING "attempts"
    `);
    const attempts = rows[0]?.attempts;
    if (attempts === undefined || !Number.isInteger(attempts)) {
      throw new Error("Auth limiter did not return a counter.");
    }
    this.pruneExpired();
    return attempts;
  }

  private pruneExpired(): void {
    const now = Date.now();
    if (now - this.lastPruneAt < 60 * 60 * 1000) return;
    this.lastPruneAt = now;
    void this.prisma.authRateLimitBucket
      .deleteMany({
        where: { resetAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } },
      })
      .catch(() => {
        // Cleanup failure does not weaken the atomic authorization decision.
      });
  }
}
