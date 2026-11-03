import type { Prisma } from "@prisma/client";
import { BRAND_CONFIG } from "@/config/brand";

/**
 * Sequential, gap-free document numbers (invoices, certificates) per Indian
 * financial year (April–March), allocated atomically from DocumentSequence.
 *
 * Format: <PREFIX>/<FY>/<00001>, e.g. "DQA-INV/2026-27/00042".
 * Numbers issued before this scheme (random "DQA-INV-XXXXXX") are kept as
 * they are; the new sequence starts at 1 for the current financial year.
 */
export type DocumentKind = "invoice" | "certificate";

const IST_OFFSET_MINUTES = 330;

/** Indian financial year label ("2026-27") for a date, evaluated in IST. */
export function financialYearLabel(date: Date = new Date()): string {
  const ist = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  const year = ist.getUTCFullYear();
  const month = ist.getUTCMonth(); // 0 = January
  const startYear = month >= 3 ? year : year - 1; // FY starts in April
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

export function documentPrefix(kind: DocumentKind): string {
  return kind === "invoice"
    ? BRAND_CONFIG.documentNumbering.invoicePrefix
    : BRAND_CONFIG.documentNumbering.certificatePrefix;
}

/**
 * Atomically allocates the next number for `kind` in the current financial
 * year. Must be called inside the caller's transaction so the number is
 * rolled back together with a failed document update.
 */
export async function allocateDocumentNumber(tx: Prisma.TransactionClient, kind: DocumentKind, now: Date = new Date()): Promise<string> {
  const period = financialYearLabel(now);
  const rows = await tx.$queryRaw<Array<{ next: number }>>`
    INSERT INTO "DocumentSequence" ("kind", "period", "next")
    VALUES (${kind}, ${period}, 1)
    ON CONFLICT ("kind", "period") DO UPDATE SET "next" = "DocumentSequence"."next" + 1
    RETURNING "next"
  `;
  const sequence = Number(rows[0]?.next ?? 1);
  return `${documentPrefix(kind)}/${period}/${String(sequence).padStart(5, "0")}`;
}
