-- Additive: per-year counter for student registration numbers. The first
-- allocation for a year seeds the counter from the highest number already
-- issued, so existing production numbers continue without a gap or a
-- duplicate; later allocations are a single atomic UPDATE under the row lock.
CREATE TABLE IF NOT EXISTS "RegistrationSequence" (
    "year" INTEGER NOT NULL,
    "next" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistrationSequence_pkey" PRIMARY KEY ("year")
);
