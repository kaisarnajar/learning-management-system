import { PrismaClient } from "@prisma/client";
import { seedBootstrap } from "./seed-bootstrap";
import { logDemoTableCounts, seedDemoBulk } from "./seed-demo-bulk";
import { demoContentLoginHint, seedDemoContent } from "./seed-demo-content";
import { demoNotificationsHint, seedDemoNotifications } from "./seed-demo-notifications";
import { generateDemoCredentials, writeDemoCredentialsFile, type DemoCredentials } from "./seed-credentials";
import { demoStudents } from "../content/demo-students";
import { demoStudentEmail } from "./seed-helpers";
import { teachers } from "../content/teachers";
import {
  getDemoAdminEmails,
  demoAdminLoginHint,
  demoDataSummaryHint,
  demoStudentLoginHint,
  demoTeacherLoginHint,
  seedDemoAdmins,
  seedDemoData,
  seedDemoTeachers,
} from "./seed-demo-data";

/**
 * The demo seed wipes every table. It may only run when BOTH guards pass:
 *  - ALLOW_DEMO_SEED=true
 *  - the DATABASE_URL host is listed in SEED_ALLOWED_DB_HOSTS (comma-separated)
 * There is no branch-based or NODE_ENV-based bypass.
 */
function assertDemoSeedAllowed() {
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    console.error("Demo seed is blocked. Set ALLOW_DEMO_SEED=true to run it against a disposable database.");
    process.exit(1);
  }

  const allowedHosts = (process.env.SEED_ALLOWED_DB_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  let dbHost = "";
  try {
    dbHost = new URL(process.env.DATABASE_URL ?? "").hostname.toLowerCase();
  } catch {
    console.error("Demo seed is blocked: DATABASE_URL is missing or not a valid URL.");
    process.exit(1);
  }

  if (allowedHosts.length === 0 || !allowedHosts.includes(dbHost)) {
    console.error(
      `Demo seed is blocked: database host "${dbHost}" is not listed in SEED_ALLOWED_DB_HOSTS.`,
    );
    process.exit(1);
  }
}

const prisma = new PrismaClient();

async function assertDatabaseMigrated() {
  const checks = [
    () => prisma.course.findFirst({ select: { featuredOnHomepage: true, status: true } }),
    () => prisma.paymentSettings.findFirst({ select: { id: true } }),
    () =>
      prisma.coursePaymentSubmission.findFirst({
        select: { paymentType: true, paymentReference: true },
      }),
    () =>
      prisma.enrollment.findFirst({
        select: { certificateEmailSentAt: true },
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

async function clearDatabase(prisma: PrismaClient) {
  console.log("Removing all current data from database...");
  const db = prisma as any;

  await prisma.$transaction([
    db.couponUsage.deleteMany(),
    db.couponRequest.deleteMany(),
    db.coupon.deleteMany(),
    db.bookOrderItem.deleteMany(),
    db.bookOrder.deleteMany(),
    db.shippingChargeSlab.deleteMany(),
    db.book.deleteMany(),
    db.courseGradeRecord.deleteMany(),
    db.courseGrade.deleteMany(),
    db.courseAttendanceRecord.deleteMany(),
    db.courseAttendance.deleteMany(),
    db.libraryItem.deleteMany(),
    db.studentReview.deleteMany(),
    db.dailyInspiration.deleteMany(),
    db.blogComment.deleteMany(),
    db.blogLike.deleteMany(),
    db.blogImage.deleteMany(),
    db.blogPost.deleteMany(),
    db.siteAnnouncementImage.deleteMany(),
    db.siteAnnouncement.deleteMany(),
    db.courseAnnouncement.deleteMany(),
    db.expense.deleteMany(),
    db.coursePaymentSubmission.deleteMany(),
    db.paymentRecord.deleteMany(),
    db.studentNotification.deleteMany(),
    db.enrollment.deleteMany(),
    db.course.deleteMany(),
    db.teacher.deleteMany(),
    db.contactInquiry.deleteMany(),
    db.fatwaQuestion.deleteMany(),
    db.account.deleteMany(),
    db.session.deleteMany(),
    db.passwordResetToken.deleteMany(),
    db.verificationToken.deleteMany(),
    db.user.deleteMany(),
    db.paymentSettings.deleteMany(),
  ]);

  console.log("Database cleared successfully.");
}

async function runSeedDemo(prismaClient: PrismaClient, credentials: DemoCredentials) {
  await assertDatabaseMigrated();
  await clearDatabase(prismaClient);

  await seedBootstrap(prismaClient);
  await seedDemoAdmins(prismaClient, credentials.adminPassword);
  await seedDemoTeachers(prismaClient, credentials.teacherPassword);
  await seedDemoData(prismaClient, credentials.studentPassword);
  await seedDemoContent(prismaClient);
  await seedDemoNotifications(prismaClient);
  await seedDemoBulk(prismaClient);

  return {
    courses: await prismaClient.course.count(),
    teachers: await prismaClient.teacher.count(),
    users: await prismaClient.user.count(),
    enrollments: await prismaClient.enrollment.count(),
    books: await prismaClient.book.count(),
    blogPosts: await prismaClient.blogPost.count(),
    fatwas: await prismaClient.fatwaQuestion.count(),
    payments: await prismaClient.paymentRecord.count(),
    expenses: await prismaClient.expense.count(),
  };
}

async function main() {
  assertDemoSeedAllowed();
  const credentials = generateDemoCredentials();
  await runSeedDemo(prisma, credentials);
  const credentialsFile = writeDemoCredentialsFile(credentials, {
    admins: getDemoAdminEmails(),
    teachers: teachers.map((t) => t.email),
    students: demoStudents.map((s) => demoStudentEmail(s.id)),
  });

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
  console.log(`Demo passwords were written to ${credentialsFile} (git-ignored). They are not printed.`);
}

if (process.argv[1]?.includes("seed-demo")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
