/**
 * Fills the typed enum columns added by migration
 * 20261103001300_status_enum_columns from their legacy text twins:
 *
 *   Enrollment.status                      -> statusEnum        (EnrollmentStatus)
 *   Enrollment.certificateType             -> certificateTypeEnum (CertificateType)
 *   CoursePaymentSubmission.status         -> statusEnum        (PaymentSubmissionStatus)
 *   CoursePaymentSubmission.paymentType    -> paymentTypeEnum   (PaymentType)
 *   CoursePaymentSubmission.paymentMethod  -> paymentMethodEnum (PaymentMethod;
 *                                             rows whose UTR is 'FEE-WAIVER' become WAIVER)
 *   PaymentRecord.paymentType              -> paymentTypeEnum   (PaymentType)
 *   DeviceToken.platform                   -> platformEnum      (DevicePlatform)
 *   Coupon.gender                          -> genderEnum        (Gender)
 *
 * Usage:
 *   npx tsx scripts/backfill-status-enums.ts            # dry run: per-value report
 *   npx tsx scripts/backfill-status-enums.ts --apply    # write in batches of 1,000
 *
 * Idempotent: only rows whose enum column is still NULL are touched, and the
 * text columns are never modified. A text value with no mapping is reported
 * (with its row count) and left NULL rather than guessed; the exit code is 1
 * in that case so a release checklist notices.
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";

const prisma = new PrismaClient();
const BATCH = 1000;

type Job = {
  table: string;
  textColumn: string;
  enumColumn: string;
  enumType: string;
  /** lower-cased text value -> enum value */
  mapping: Record<string, string>;
  /** Extra WHERE (SQL) applied before the generic mapping; value is the enum to set. */
  special?: { description: string; where: Prisma.Sql; enumValue: string };
};

const PAYMENT_TYPE_MAPPING = {
  monthly: "MONTHLY",
  quarterly: "QUARTERLY",
  half_yearly: "HALF_YEARLY",
  yearly: "YEARLY",
  one_time: "ONE_TIME",
  enrollment: "ENROLLMENT",
  manual: "MANUAL",
  book_purchase: "BOOK_PURCHASE",
};

const JOBS: Job[] = [
  {
    table: "Enrollment",
    textColumn: "status",
    enumColumn: "statusEnum",
    enumType: "EnrollmentStatus",
    mapping: {
      pending_approval: "PENDING_APPROVAL",
      awaiting_enrollment_fee: "AWAITING_ENROLLMENT_FEE",
      active: "ACTIVE",
      completed: "COMPLETED",
      rejected: "REJECTED",
    },
  },
  {
    table: "Enrollment",
    textColumn: "certificateType",
    enumColumn: "certificateTypeEnum",
    enumType: "CertificateType",
    mapping: { appreciation: "APPRECIATION", completion: "COMPLETION" },
  },
  {
    table: "CoursePaymentSubmission",
    textColumn: "status",
    enumColumn: "statusEnum",
    enumType: "PaymentSubmissionStatus",
    mapping: { pending_verification: "PENDING_VERIFICATION", approved: "APPROVED", rejected: "DECLINED" },
  },
  {
    table: "CoursePaymentSubmission",
    textColumn: "paymentType",
    enumColumn: "paymentTypeEnum",
    enumType: "PaymentType",
    mapping: PAYMENT_TYPE_MAPPING,
  },
  {
    table: "CoursePaymentSubmission",
    textColumn: "paymentMethod",
    enumColumn: "paymentMethodEnum",
    enumType: "PaymentMethod",
    mapping: { upi: "UPI", bank: "BANK", waiver: "WAIVER", cash: "CASH" },
    special: {
      description: "upiTransactionId = 'FEE-WAIVER' (fee waivers recorded before paymentMethod existed)",
      where: Prisma.sql`"upiTransactionId" = 'FEE-WAIVER'`,
      enumValue: "WAIVER",
    },
  },
  {
    table: "PaymentRecord",
    textColumn: "paymentType",
    enumColumn: "paymentTypeEnum",
    enumType: "PaymentType",
    mapping: PAYMENT_TYPE_MAPPING,
  },
  {
    table: "DeviceToken",
    textColumn: "platform",
    enumColumn: "platformEnum",
    enumType: "DevicePlatform",
    mapping: { android: "ANDROID", ios: "IOS", web: "WEB" },
  },
  {
    table: "Coupon",
    textColumn: "gender",
    enumColumn: "genderEnum",
    enumType: "Gender",
    mapping: { male: "MALE", female: "FEMALE" },
  },
];

function ident(name: string): Prisma.Sql {
  // Identifiers come from the JOBS table above, never from input.
  return Prisma.raw(`"${name}"`);
}

async function updateInBatches(job: Job, where: Prisma.Sql, enumValue: string): Promise<number> {
  let total = 0;
  for (;;) {
    const count = await prisma.$executeRaw`
      UPDATE ${ident(job.table)} SET ${ident(job.enumColumn)} = CAST(${enumValue} AS ${Prisma.raw(`"${job.enumType}"`)})
      WHERE "id" IN (
        SELECT "id" FROM ${ident(job.table)}
        WHERE ${ident(job.enumColumn)} IS NULL AND ${where}
        LIMIT ${BATCH}
      )`;
    total += count;
    if (count < BATCH) return total;
  }
}

async function main() {
  const apply = isApplyMode();
  printMode("backfill-status-enums", apply);

  let unmappedTotal = 0;
  const plan: Array<{ table: string; column: string; value: string | null; rows: number; enumValue: string | null }> = [];

  for (const job of JOBS) {
    console.log(`\n${job.table}.${job.textColumn} -> ${job.enumColumn}`);

    if (job.special) {
      const special = await prisma.$queryRaw<Array<{ rows: number }>>`
        SELECT COUNT(*)::int AS rows FROM ${ident(job.table)}
        WHERE ${ident(job.enumColumn)} IS NULL AND ${job.special.where}`;
      const rows = special[0]?.rows ?? 0;
      console.log(`  ${job.special.description}: ${rows} row(s) -> ${job.special.enumValue}`);
      plan.push({ table: job.table, column: job.enumColumn, value: "<special>", rows, enumValue: job.special.enumValue });
    }

    const groups = await prisma.$queryRaw<Array<{ value: string | null; rows: number }>>`
      SELECT lower(${ident(job.textColumn)}) AS value, COUNT(*)::int AS rows
      FROM ${ident(job.table)}
      WHERE ${ident(job.enumColumn)} IS NULL
        ${job.special ? Prisma.sql`AND NOT (${job.special.where})` : Prisma.empty}
      GROUP BY lower(${ident(job.textColumn)})
      ORDER BY rows DESC`;

    for (const group of groups) {
      const enumValue = group.value == null ? null : (job.mapping[group.value] ?? null);
      if (group.value == null) {
        console.log(`  (null): ${group.rows} row(s) -> left NULL`);
      } else if (enumValue) {
        console.log(`  ${group.value}: ${group.rows} row(s) -> ${enumValue}`);
      } else {
        unmappedTotal += group.rows;
        console.log(`  ${group.value}: ${group.rows} row(s) -> NO MAPPING (left NULL; resolve by hand)`);
      }
      plan.push({ table: job.table, column: job.enumColumn, value: group.value, rows: group.rows, enumValue });
    }
    if (groups.length === 0 && !job.special) console.log("  nothing to do");
  }

  if (unmappedTotal > 0) {
    console.log(`\n${unmappedTotal} row(s) have text values with no enum mapping. They stay NULL and the compat layer keeps reading the text column.`);
    process.exitCode = 1;
  }

  if (!apply) return;

  const snapshot = writeSnapshot("backfill-status-enums", plan);
  console.log(`\nPlan snapshot written to ${snapshot} (reverse by setting the enum column back to NULL).`);

  for (const job of JOBS) {
    let written = 0;
    if (job.special) {
      written += await updateInBatches(job, job.special.where, job.special.enumValue);
    }
    for (const [text, enumValue] of Object.entries(job.mapping)) {
      written += await updateInBatches(job, Prisma.sql`lower(${ident(job.textColumn)}) = ${text}`, enumValue);
    }
    console.log(`${job.table}.${job.enumColumn}: updated ${written} row(s)`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
