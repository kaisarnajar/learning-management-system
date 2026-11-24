import { Prisma, type PrismaClient } from "@prisma/client";

/**
 * Every text status/type column and its typed twin (migration
 * 20261103001300_status_enum_columns). Where-clauses filter on the twin, so a
 * row whose text is set but whose twin is NULL is invisible to them.
 */
export const STATUS_COLUMN_PAIRS = [
  { table: "Enrollment", text: "status", typed: "statusEnum" },
  { table: "Enrollment", text: "certificateType", typed: "certificateTypeEnum" },
  { table: "CoursePaymentSubmission", text: "status", typed: "statusEnum" },
  { table: "CoursePaymentSubmission", text: "paymentType", typed: "paymentTypeEnum" },
  { table: "CoursePaymentSubmission", text: "paymentMethod", typed: "paymentMethodEnum" },
  { table: "PaymentRecord", text: "paymentType", typed: "paymentTypeEnum" },
  { table: "DeviceToken", text: "platform", typed: "platformEnum" },
  { table: "Coupon", text: "gender", typed: "genderEnum" },
] as const;

export type StatusBackfillGap = { table: string; text: string; typed: string; missing: number };

/** Rows whose text column has a value but whose typed twin is still NULL, per column pair. */
export async function findStatusBackfillGaps(prisma: PrismaClient): Promise<StatusBackfillGap[]> {
  const gaps: StatusBackfillGap[] = [];
  for (const pair of STATUS_COLUMN_PAIRS) {
    // Identifiers come from the constant table above, never from input.
    const rows = await prisma.$queryRaw<Array<{ missing: bigint }>>(
      Prisma.sql`SELECT COUNT(*) AS missing FROM ${Prisma.raw(`"${pair.table}"`)}
                 WHERE ${Prisma.raw(`"${pair.text}"`)} IS NOT NULL AND ${Prisma.raw(`"${pair.typed}"`)} IS NULL`,
    );
    gaps.push({ ...pair, missing: Number(rows[0]?.missing ?? 0) });
  }
  return gaps;
}
