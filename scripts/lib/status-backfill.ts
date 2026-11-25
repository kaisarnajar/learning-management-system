import { Prisma, type PrismaClient } from "@prisma/client";
import {
  certificateTypeFromText,
  devicePlatformFromText,
  enrollmentStatusFromText,
  genderFromText,
  paymentMethodFromText,
  paymentTypeFromText,
  submissionStatusFromText,
} from "../../services/status-compat";

/**
 * Every text status/type column and its typed twin (migration
 * 20261103001300_status_enum_columns). Where-clauses filter on the twin, so a
 * row whose text is set but whose twin is NULL is invisible to them.
 */
export const STATUS_COLUMN_PAIRS = [
  { table: "Enrollment", text: "status", typed: "statusEnum", fromText: enrollmentStatusFromText },
  { table: "Enrollment", text: "certificateType", typed: "certificateTypeEnum", fromText: certificateTypeFromText },
  { table: "CoursePaymentSubmission", text: "status", typed: "statusEnum", fromText: submissionStatusFromText },
  { table: "CoursePaymentSubmission", text: "paymentType", typed: "paymentTypeEnum", fromText: paymentTypeFromText },
  { table: "CoursePaymentSubmission", text: "paymentMethod", typed: "paymentMethodEnum", fromText: paymentMethodFromText },
  { table: "PaymentRecord", text: "paymentType", typed: "paymentTypeEnum", fromText: paymentTypeFromText },
  { table: "DeviceToken", text: "platform", typed: "platformEnum", fromText: devicePlatformFromText },
  { table: "Coupon", text: "gender", typed: "genderEnum", fromText: genderFromText },
] as const;

export type StatusBackfillGap = { table: string; text: string; typed: string; missing: number; mismatched: number };

/**
 * Per column pair: `missing` counts rows whose text column has a value but
 * whose typed twin is still NULL; `mismatched` counts rows whose twin
 * disagrees with a text that has a mapping. Migration
 * 20261124000800_status_twin_agreement fills the missing twins itself, but
 * its CHECK constraints refuse any later UPDATE of a mismatched row, so
 * `mismatched` must be 0 before that migration is deployed (and before the
 * follow-up that VALIDATEs the constraints).
 */
export async function findStatusBackfillGaps(prisma: Pick<PrismaClient, "$queryRaw">): Promise<StatusBackfillGap[]> {
  const gaps: StatusBackfillGap[] = [];
  for (const pair of STATUS_COLUMN_PAIRS) {
    // Identifiers come from the constant table above, never from input.
    const rows = await prisma.$queryRaw<Array<{ missing: bigint }>>(
      Prisma.sql`SELECT COUNT(*) AS missing FROM ${Prisma.raw(`"${pair.table}"`)}
                 WHERE ${Prisma.raw(`"${pair.text}"`)} IS NOT NULL AND ${Prisma.raw(`"${pair.typed}"`)} IS NULL`,
    );
    const pairs = await prisma.$queryRaw<Array<{ text: string; typed: string; rows: bigint }>>(
      Prisma.sql`SELECT ${Prisma.raw(`"${pair.text}"`)} AS text, ${Prisma.raw(`"${pair.typed}"`)}::text AS typed, COUNT(*) AS rows
                 FROM ${Prisma.raw(`"${pair.table}"`)}
                 WHERE ${Prisma.raw(`"${pair.text}"`)} IS NOT NULL AND ${Prisma.raw(`"${pair.typed}"`)} IS NOT NULL
                 ${pair.typed === "paymentMethodEnum" ? Prisma.sql`AND NOT ("paymentMethodEnum" = 'WAIVER' AND "upiTransactionId" = 'FEE-WAIVER')` : Prisma.empty}
                 GROUP BY 1, 2`,
    );
    const mismatched = pairs.reduce((sum, row) => {
      const mapped = pair.fromText(row.text);
      return mapped !== null && mapped !== row.typed ? sum + Number(row.rows) : sum;
    }, 0);
    gaps.push({ table: pair.table, text: pair.text, typed: pair.typed, missing: Number(rows[0]?.missing ?? 0), mismatched });
  }
  return gaps;
}
