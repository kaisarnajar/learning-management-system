import { PrismaClient } from "@prisma/client";
import { seedBootstrap } from "./seed-bootstrap";
import { logDemoTableCounts, seedDemoBulk } from "./seed-demo-bulk";
import { demoContentLoginHint, seedDemoContent } from "./seed-demo-content";
import { demoNotificationsHint, seedDemoNotifications } from "./seed-demo-notifications";
import {
  demoAdminLoginHint,
  demoDataSummaryHint,
  demoStudentLoginHint,
  demoTeacherLoginHint,
  seedDemoAdmins,
  seedDemoData,
  seedDemoTeachers,
} from "./seed-demo-data";

function assertDemoSeedAllowed() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    console.error(
      "Demo seed is blocked when NODE_ENV=production. Set ALLOW_DEMO_SEED=true to override.",
    );
    process.exit(1);
  }
}

const prisma = new PrismaClient();

async function assertDatabaseMigrated() {
  const checks = [
    () => prisma.course.findFirst({ select: { featuredOnHomepage: true, status: true } }),
    () => prisma.paymentSettings.findFirst({ select: { id: true } }),
    () => prisma.socialLinksSettings.findFirst({ select: { id: true } }),
    () =>
      prisma.coursePaymentSubmission.findFirst({
        select: { paymentType: true, paymentReference: true },
      }),
    () =>
      prisma.enrollment.findFirst({
        select: { uploadedCertificatePath: true, certificateEmailSentAt: true },
      }),
    () =>
      prisma.paymentRecord.findFirst({
        select: { receiptEmailSentAt: true, paymentType: true },
      }),
    () => prisma.expense.findFirst({ select: { category: true, teacherId: true } }),
    () => prisma.blogImage.findFirst({ select: { id: true } }),
    () => prisma.fatwaQuestion.findFirst({ select: { featuredOnHomepage: true } }),
    () => prisma.studentReview.findFirst({ select: { rating: true, status: true } }),
    () =>
      prisma.studentNotification.findFirst({
        select: { type: true, sourceId: true, readAt: true },
      }),
    () => prisma.book.findFirst({ select: { id: true } }),
  ];

  try {
    await Promise.all(checks.map((check) => check()));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("does not exist")) {
      console.error(
        "Database schema is missing or out of date. Run `npm run db:migrate` first, then `npm run db:seed:demo`.",
      );
      process.exit(1);
    }
    throw error;
  }
}

async function main() {
  assertDemoSeedAllowed();
  await assertDatabaseMigrated();

  await seedBootstrap(prisma);
  await seedDemoAdmins(prisma);
  await seedDemoTeachers(prisma);
  await seedDemoData(prisma);
  await seedDemoContent(prisma);
  await seedDemoNotifications(prisma);
  await seedDemoBulk(prisma);

  console.log(
    "Seeded demo data: courses, teachers, library, testimonials, logins, students, finance, contact inquiries, announcements, blogs, verse/hadith, fatwa, notifications, and bulk QA datasets.",
  );
  await logDemoTableCounts(prisma);
  console.log(demoDataSummaryHint());
  console.log(demoContentLoginHint());
  console.log(demoNotificationsHint());
  console.log(demoAdminLoginHint());
  console.log(demoTeacherLoginHint());
  console.log(demoStudentLoginHint());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
