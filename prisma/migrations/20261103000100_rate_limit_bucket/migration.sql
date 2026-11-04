-- Additive, idempotent: safe to run against a database that already has the table.
CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "RateLimitBucket_windowStart_idx" ON "RateLimitBucket"("windowStart");
