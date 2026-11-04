import type { Prisma } from "@prisma/client";
import { BRAND_CONFIG } from "@/config/brand";
import { prisma } from "@/utils/prisma";

function registrationPrefix(year: number): string {
  return `${BRAND_CONFIG.registrationPrefix}${year}-`;
}

/**
 * Allocates the next registration number for a year, e.g. DQA2026-00042.
 *
 * The counter lives in RegistrationSequence. The first allocation for a year
 * inserts the row seeded from the highest number already issued (so numbers
 * handed out before the counter existed are never reused); every later call
 * is one atomic UPDATE on that row, which Postgres serialises, so two
 * students completing their profile at the same instant get distinct
 * numbers. Call it inside the transaction that stores the number.
 */
export async function generateNextRegistrationNumberTx(tx: Prisma.TransactionClient, year: number): Promise<string> {
  const prefix = registrationPrefix(year);
  const rows = await tx.$queryRaw<Array<{ next: number }>>`
    INSERT INTO "RegistrationSequence" ("year", "next")
    VALUES (
      ${year},
      COALESCE((
        SELECT MAX(CAST(SUBSTRING("registrationNumber" FROM ${prefix.length + 1}::int) AS INTEGER))
        FROM "User"
        WHERE "registrationNumber" LIKE ${`${prefix}%`}
          AND SUBSTRING("registrationNumber" FROM ${prefix.length + 1}::int) ~ '^[0-9]+$'
      ), 0) + 1
    )
    ON CONFLICT ("year") DO UPDATE
      SET "next" = "RegistrationSequence"."next" + 1, "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "next"
  `;
  const sequence = Number(rows[0]?.next ?? 1);
  return `${prefix}${String(sequence).padStart(5, "0")}`;
}

/** Standalone variant for callers outside a transaction. */
export async function generateNextRegistrationNumber(year: number): Promise<string> {
  return prisma.$transaction((tx) => generateNextRegistrationNumberTx(tx, year));
}
