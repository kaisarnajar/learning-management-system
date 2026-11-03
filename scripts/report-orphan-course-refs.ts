/**
 * READ-ONLY report of Enrollment and CoursePaymentSubmission rows whose
 * courseId points at no existing Course. Migration
 * 20261103001000_course_relations adds foreign keys for both columns and
 * fails (and rolls back) while any such row exists, so run this against the
 * target database before deploying that migration.
 *
 * Usage: npx tsx scripts/report-orphan-course-refs.ts
 *
 * For each row the academy decides: re-point courseId at the right course
 * (the course was re-created under a new id), or mark the row as deleted
 * (CoursePaymentSubmission.deletedAt) / rejected (Enrollment.rejectedAt) and
 * re-point it at a placeholder course kept for history. This script changes
 * nothing.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type OrphanRow = { id: string; courseId: string; userId: string; status: string; createdAt: Date };

async function main() {
  const enrollments = await prisma.$queryRaw<OrphanRow[]>`
    SELECT e."id", e."courseId", e."userId", e."status", e."createdAt"
    FROM "Enrollment" e
    LEFT JOIN "Course" c ON c."id" = e."courseId"
    WHERE c."id" IS NULL
    ORDER BY e."createdAt"`;

  const submissions = await prisma.$queryRaw<OrphanRow[]>`
    SELECT s."id", s."courseId", s."userId", s."status", s."createdAt"
    FROM "CoursePaymentSubmission" s
    LEFT JOIN "Course" c ON c."id" = s."courseId"
    WHERE c."id" IS NULL
    ORDER BY s."createdAt"`;

  console.log(`Enrollments with no matching course: ${enrollments.length}`);
  for (const row of enrollments) {
    console.log(`  ${row.id}  course=${row.courseId}  user=${row.userId}  status=${row.status}  ${row.createdAt.toISOString()}`);
  }
  console.log(`Fee submissions with no matching course: ${submissions.length}`);
  for (const row of submissions) {
    console.log(`  ${row.id}  course=${row.courseId}  user=${row.userId}  status=${row.status}  ${row.createdAt.toISOString()}`);
  }

  const missingCourseIds = [...new Set([...enrollments, ...submissions].map((r) => r.courseId))];
  if (missingCourseIds.length > 0) {
    console.log(`\nMissing course ids (${missingCourseIds.length}): ${missingCourseIds.join(", ")}`);
    console.log("Resolve every row above before deploying migration 20261103001000_course_relations.");
    process.exitCode = 1;
  } else {
    console.log("\nNo orphans: migration 20261103001000_course_relations can be deployed.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
