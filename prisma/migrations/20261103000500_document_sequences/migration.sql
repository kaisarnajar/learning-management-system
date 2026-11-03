-- Additive: per-financial-year counters for sequential invoice and certificate numbers.
CREATE TABLE IF NOT EXISTS "DocumentSequence" (
    "kind" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentSequence_pkey" PRIMARY KEY ("kind", "period")
);
