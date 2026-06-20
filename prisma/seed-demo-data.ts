import { hash } from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { getAdminEmails } from "../lib/admin";

import { syncEnrollmentsWithCourseStatus } from "../lib/completion";
import { courses } from "../content/courses";
import {
  DEMO_ADMIN_PASSWORD,
  DEMO_STUDENT_COUNT,
  DEMO_STUDENT_PASSWORD,
  demoStudents,
  type DemoEnrollment,
  type DemoPayment,
} from "../content/demo-students";
import { DEMO_TEACHER_PASSWORD, teachers } from "../content/teachers";
import {
  buildEnrollmentFeeLabel,
  buildMonthlyFeeLabel,
} from "../lib/monthly-payments";
import {
  EXPENSE_CATEGORY_MARKETING,
  EXPENSE_CATEGORY_SOFTWARE_TOOLS,
  EXPENSE_CATEGORY_TEACHER_SALARY,
  EXPENSE_CATEGORY_WEBSITE_HOSTING,
} from "../lib/expense-categories";
import {
  MONTHLY_PAYMENT_APPROVED,
  MONTHLY_PAYMENT_DECLINED,
  MONTHLY_PAYMENT_PENDING,
  PAYMENT_TYPE_ENROLLMENT,
  PAYMENT_TYPE_MANUAL,
  PAYMENT_TYPE_MONTHLY,
} from "../lib/monthly-payment-status";
import {
  demoAdminUserId,
  demoEnrollmentId,
  demoStudentEmail,
  demoStudentUserId,
  demoTeacherUserId,
} from "./seed-helpers";
import { writeDemoPdfFile, writeDemoPngFile } from "./seed-demo-assets";

type CourseSeedMeta = {
  monthlyFeeInrPaise: number;
  enrollmentFeeInrPaise: number;
  title: string;
};

function demoUserId(studentId: string) {
  return demoStudentUserId(studentId);
}

function demoUserEmail(studentId: string) {
  return demoStudentEmail(studentId);
}

function demoEnrollmentIdFor(studentId: string, courseId: string) {
  return demoEnrollmentId(studentId, courseId);
}

function demoPaymentId(
  studentId: string,
  courseId: string,
  payment: DemoPayment,
) {
  if (payment.paymentType === PAYMENT_TYPE_ENROLLMENT) {
    return `seed-demo-payment-${studentId}-${courseId}-enrollment`;
  }
  return `seed-demo-payment-${studentId}-${courseId}-${payment.month}-${payment.year}`;
}

function demoPaymentRecordId(
  studentId: string,
  courseId: string,
  payment: DemoPayment,
) {
  if (payment.paymentType === PAYMENT_TYPE_ENROLLMENT) {
    return `seed-demo-record-${studentId}-${courseId}-enrollment`;
  }
  return `seed-demo-record-${studentId}-${courseId}-${payment.month}-${payment.year}`;
}

function paymentPaidAt(payment: DemoPayment) {
  if (payment.paymentType === PAYMENT_TYPE_ENROLLMENT) {
    return new Date("2026-01-10T10:00:00.000Z");
  }
  const m = Number.parseInt(payment.month ?? "1", 10);
  const y = Number.parseInt(payment.year ?? "2026", 10);
  return new Date(Date.UTC(y, m - 1, 15, 10, 0, 0));
}

async function seedDemoPayment(
  prisma: PrismaClient,
  studentId: string,
  userId: string,
  courseId: string,
  courseMeta: CourseSeedMeta,
  payment: DemoPayment,
) {
  const paymentType = payment.paymentType ?? PAYMENT_TYPE_MONTHLY;
  const submissionId = demoPaymentId(studentId, courseId, payment);
  const amountInrPaise =
    paymentType === PAYMENT_TYPE_ENROLLMENT
      ? courseMeta.enrollmentFeeInrPaise
      : courseMeta.monthlyFeeInrPaise;
  const label =
    paymentType === PAYMENT_TYPE_ENROLLMENT
      ? buildEnrollmentFeeLabel(courseMeta.title)
      : buildMonthlyFeeLabel(payment.month ?? "01", payment.year ?? "2026");
  const utr = `DEMO-UTR-${studentId}-${courseId}-${paymentType}-${submissionId.slice(-8)}`;

  if (payment.status === "approved") {
    const recordId = demoPaymentRecordId(studentId, courseId, payment);
    const paidAt = paymentPaidAt(payment);
    const receiptEmailSentAt =
      studentId === "06" && paymentType === PAYMENT_TYPE_ENROLLMENT ? paidAt : null;

    await prisma.paymentRecord.upsert({
      where: { id: recordId },
      create: {
        id: recordId,
        userId,
        courseId,
        amountInrPaise,
        paidAt,
        paymentType,
        description: label,
        receiptEmailSentAt,
      },
      update: {
        amountInrPaise,
        paidAt,
        paymentType,
        description: label,
        receiptEmailSentAt,
      },
    });

    await prisma.coursePaymentSubmission.upsert({
      where: { id: submissionId },
      create: {
        id: submissionId,
        userId,
        courseId,
        paymentType,
        label,
        amountInrPaise,
        status: MONTHLY_PAYMENT_APPROVED,
        paymentMethod: "upi",
        upiTransactionId: utr,
        paymentReference: `DEMO-REF-${submissionId}`,
        paymentRecordId: recordId,
      },
      update: {
        paymentType,
        label,
        amountInrPaise,
        status: MONTHLY_PAYMENT_APPROVED,
        paymentMethod: "upi",
        upiTransactionId: utr,
        paymentRecordId: recordId,
      },
    });
    return;
  }

  const status =
    payment.status === "pending" ? MONTHLY_PAYMENT_PENDING : MONTHLY_PAYMENT_DECLINED;

  const paymentScreenshotPath =
    payment.status === "pending"
      ? `/uploads/payments/${submissionId}-demo.png`
      : null;

  if (paymentScreenshotPath) {
    await writeDemoPngFile(paymentScreenshotPath);
  }

  await prisma.coursePaymentSubmission.upsert({
    where: { id: submissionId },
    create: {
      id: submissionId,
      userId,
      courseId,
      paymentType,
      label,
      amountInrPaise,
      status,
      paymentMethod: payment.status === "pending" ? "upi" : null,
      upiTransactionId: payment.status === "pending" ? utr : null,
      paymentReference: payment.status === "pending" ? `DEMO-REF-${submissionId}` : null,
      paymentScreenshotPath,
    },
    update: {
      paymentType,
      label,
      amountInrPaise,
      status,
      paymentMethod: payment.status === "pending" ? "upi" : null,
      upiTransactionId: payment.status === "pending" ? utr : null,
      paymentRecordId: null,
      paymentScreenshotPath,
    },
  });
}

async function seedDemoEnrollment(
  prisma: PrismaClient,
  studentId: string,
  userId: string,
  enrollment: DemoEnrollment,
  courseMetaById: Map<string, CourseSeedMeta>,
) {
  const courseMeta = courseMetaById.get(enrollment.courseId);
  if (!courseMeta) return;

  const enrollmentId = demoEnrollmentIdFor(studentId, enrollment.courseId);
  const completedAt =
    enrollment.status === "completed" && enrollment.completedAt
      ? new Date(enrollment.completedAt)
      : enrollment.status === "completed"
        ? new Date("2026-03-01T12:00:00.000Z")
        : null;

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: { userId, courseId: enrollment.courseId },
    },
    create: {
      id: enrollmentId,
      userId,
      courseId: enrollment.courseId,
      status: enrollment.status,
      completedAt,
    },
    update: {
      status: enrollment.status,
      completedAt,
    },
  });

  for (const payment of enrollment.payments ?? []) {
    await seedDemoPayment(prisma, studentId, userId, enrollment.courseId, courseMeta, payment);
  }
}

/** Completed course with roster for admin certificate / students QA. */
async function seedCompletedCourseScenario(prisma: PrismaClient) {
  const courseId = "qiraat-advanced";
  const studentId = "19";
  const userId = demoUserId(studentId);
  const enrollmentId = demoEnrollmentIdFor(studentId, courseId);
  

  await prisma.enrollment.upsert({
    where: {
      userId_courseId: { userId, courseId },
    },
    create: {
      id: enrollmentId,
      userId,
      courseId,
      status: "completed",
      completedAt: new Date("2026-05-01T12:00:00.000Z"),
      
    },
    update: {
      status: "completed",
      completedAt: new Date("2026-05-01T12:00:00.000Z"),
      
    },
  });

  await syncEnrollmentsWithCourseStatus(courseId, "COMPLETED");
}

async function syncCompletedCourseEnrollments(prisma: PrismaClient) {
  const completedCourses = await prisma.course.findMany({
    where: { status: "COMPLETED" },
    select: { id: true, status: true },
  });

  for (const course of completedCourses) {
    await syncEnrollmentsWithCourseStatus(course.id, course.status);
  }
}

/** Admin login accounts for every address in `ADMIN_EMAIL` (local / QA). */
function demoAdminDisplayName(email: string) {
  const local = email.split("@")[0] ?? "admin";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export async function seedDemoAdmins(prisma: PrismaClient) {
  const emails = getAdminEmails();
  if (emails.length === 0) return;

  const hashedPassword = await hash(DEMO_ADMIN_PASSWORD, 12);

  for (const [index, email] of emails.entries()) {
    await prisma.user.upsert({
      where: { email },
      create: {
        id: demoAdminUserId(index),
        email,
        name: demoAdminDisplayName(email),
        password: hashedPassword,
      },
      update: {
        name: demoAdminDisplayName(email),
        password: hashedPassword,
      },
    });
  }
}

/** Demo teacher login accounts matching seeded teacher profiles (local / QA). */
export async function seedDemoTeachers(prisma: PrismaClient) {
  const hashedPassword = await hash(DEMO_TEACHER_PASSWORD, 12);

  for (const teacher of teachers) {
    const userId = demoTeacherUserId(teacher.id);

    await prisma.user.upsert({
      where: { email: teacher.email },
      create: {
        id: userId,
        email: teacher.email,
        name: teacher.name,
        password: hashedPassword,
      },
      update: {
        name: teacher.name,
        password: hashedPassword,
      },
    });
  }
}

/** Demo students with enrollments, enrollment fees, and monthly payments (local / QA). */
export async function seedDemoData(prisma: PrismaClient) {
  const courses = await prisma.course.findMany({
    select: {
      id: true,
      title: true,
      monthlyFeeInrPaise: true,
      priceInrPaise: true,
    },
  });
  const courseMetaById = new Map<string, CourseSeedMeta>(
    courses.map((course) => [
      course.id,
      {
        monthlyFeeInrPaise: course.monthlyFeeInrPaise,
        enrollmentFeeInrPaise: course.priceInrPaise,
        title: course.title,
      },
    ]),
  );

  const hashedPassword = await hash(DEMO_STUDENT_PASSWORD, 12);

  for (const student of demoStudents) {
    const userId = demoUserId(student.id);
    const email = demoUserEmail(student.id);

    await prisma.user.upsert({
      where: { id: userId },
      create: {
        id: userId,
        email,
        name: student.name,
        fatherName: student.fatherName,
        dateOfBirth: new Date(student.dateOfBirth),
        occupation: student.occupation,
        address: student.address,
        whatsapp: student.whatsapp,
        password: hashedPassword,
      },
      update: {
        email,
        name: student.name,
        fatherName: student.fatherName,
        dateOfBirth: new Date(student.dateOfBirth),
        occupation: student.occupation,
        address: student.address,
        whatsapp: student.whatsapp,
        password: hashedPassword,
      },
    });

    for (const enrollment of student.enrollments) {
      await seedDemoEnrollment(prisma, student.id, userId, enrollment, courseMetaById);
    }
  }

  await seedDemoStudentReviews(prisma);
  await seedDemoManualPayment(prisma);
  await seedDemoExpenses(prisma);
  await seedCompletedCourseScenario(prisma);
  await syncCompletedCourseEnrollments(prisma);
}

/** Manual income entry for /admin/finance income tab (no linked submission). */
async function seedDemoManualPayment(prisma: PrismaClient) {
  await prisma.paymentRecord.upsert({
    where: { id: "seed-demo-manual-payment-01" },
    create: {
      id: "seed-demo-manual-payment-01",
      userId: demoUserId("01"),
      courseId: "quran-nazira",
      amountInrPaise: 50_000,
      paidAt: new Date("2026-02-15T10:00:00.000Z"),
      paymentType: PAYMENT_TYPE_MANUAL,
      description: "Cash payment recorded by admin (demo)",
    },
    update: {
      amountInrPaise: 50_000,
      paidAt: new Date("2026-02-15T10:00:00.000Z"),
      paymentType: PAYMENT_TYPE_MANUAL,
      description: "Cash payment recorded by admin (demo)",
    },
  });
}

const demoExpenses = [
  {
    id: "seed-demo-expense-salary-teacher-1-feb",
    category: EXPENSE_CATEGORY_TEACHER_SALARY,
    teacherId: "1",
    amountInrPaise: 25_000_00,
    paidAt: new Date("2026-02-01T12:00:00.000Z"),
    description: "February salary — Moulana Ibrahim Khan",
  },
  {
    id: "seed-demo-expense-salary-teacher-2-feb",
    category: EXPENSE_CATEGORY_TEACHER_SALARY,
    teacherId: "2",
    amountInrPaise: 22_000_00,
    paidAt: new Date("2026-02-01T12:00:00.000Z"),
    description: "February salary — Moulana Yusuf Ahmed",
  },
  {
    id: "seed-demo-expense-salary-teacher-1-mar",
    category: EXPENSE_CATEGORY_TEACHER_SALARY,
    teacherId: "1",
    amountInrPaise: 25_000_00,
    paidAt: new Date("2026-03-01T12:00:00.000Z"),
    description: "March salary — Moulana Ibrahim Khan",
  },
  {
    id: "seed-demo-expense-hosting-feb",
    category: EXPENSE_CATEGORY_WEBSITE_HOSTING,
    teacherId: null,
    amountInrPaise: 1_200_00,
    paidAt: new Date("2026-02-05T09:00:00.000Z"),
    description: "Annual domain and hosting renewal",
  },
  {
    id: "seed-demo-expense-marketing-mar",
    category: EXPENSE_CATEGORY_MARKETING,
    teacherId: null,
    amountInrPaise: 3_500_00,
    paidAt: new Date("2026-03-10T14:00:00.000Z"),
    description: "Social media ad campaign — Ramadan enrollment",
  },
  {
    id: "seed-demo-expense-software-apr",
    category: EXPENSE_CATEGORY_SOFTWARE_TOOLS,
    teacherId: null,
    amountInrPaise: 800_00,
    paidAt: new Date("2026-04-01T11:00:00.000Z"),
    description: "Zoom Pro subscription",
  },
] as const;

async function seedDemoExpenses(prisma: PrismaClient) {
  for (const expense of demoExpenses) {
    await prisma.expense.upsert({
      where: { id: expense.id },
      create: {
        id: expense.id,
        category: expense.category,
        teacherId: expense.teacherId,
        amountInrPaise: expense.amountInrPaise,
        paidAt: expense.paidAt,
        description: expense.description,
      },
      update: {
        category: expense.category,
        teacherId: expense.teacherId,
        amountInrPaise: expense.amountInrPaise,
        paidAt: expense.paidAt,
        description: expense.description,
      },
    });
  }
}

const demoStudentReviews = [
  {
    id: "seed-demo-review-pending",
    studentId: "07",
    quote:
      "The Tajweed sessions helped me fix long-standing mistakes. I hope this review can be published soon.",
    course: "Tajweed Intensive",
    location: "Sopore, J&K",
    rating: 5,
    status: "PENDING" as const,
  },
  {
    id: "seed-demo-review-rejected",
    studentId: "08",
    quote: "Great teachers and flexible timings for working professionals.",
    course: "Arabic Grammar",
    location: "Kupwara, J&K",
    rating: 3,
    status: "REJECTED" as const,
  },
];

async function seedDemoStudentReviews(prisma: PrismaClient) {
  for (const review of demoStudentReviews) {
    await prisma.studentReview.upsert({
      where: { id: review.id },
      create: {
        id: review.id,
        userId: demoUserId(review.studentId),
        quote: review.quote,
        course: review.course,
        location: review.location,
        rating: review.rating,
        status: review.status,
        featuredOnHomepage: false,
      },
      update: {
        quote: review.quote,
        course: review.course,
        location: review.location,
        rating: review.rating,
        status: review.status,
        featuredOnHomepage: false,
      },
    });
  }
}

export function demoStudentLoginHint(): string {
  const last = String(DEMO_STUDENT_COUNT).padStart(2, "0");
  return `Demo students: demo-student-01@seed.local … demo-student-${last}@seed.local — password ${DEMO_STUDENT_PASSWORD}`;
}

export function demoTeacherLoginHint(): string {
  const first = teachers[0]?.email ?? "teacher@seed.local";
  const last = teachers[teachers.length - 1]?.email ?? first;
  return `Demo teachers: ${first} … ${last} — password ${DEMO_TEACHER_PASSWORD}`;
}

export function demoAdminLoginHint(): string {
  const emails = getAdminEmails();
  if (emails.length === 0) {
    return "Demo admins: none — set ADMIN_EMAIL in .env and re-run seed.";
  }
  return `Demo admins: ${emails.join(", ")} — password ${DEMO_ADMIN_PASSWORD}`;
}

export function demoDataSummaryHint(): string {
  return [
    `Demo dataset: ${courses.length} courses, ${teachers.length} teachers, ${DEMO_STUDENT_COUNT} students`,
    "  Courses — PUBLISHED, ONGOING, COMPLETED, ON_HOLD, and DRAFT examples",
    "  Enrollments — pending approval (free), awaiting fee, active, completed (student 19 certificate on qiraat-advanced)",
    "  Payments — enrollment fee + monthly fee (approved, pending with screenshot, declined)",
    "  Finance — income records with paymentType; 1 manual payment; 100+ demo expenses for /admin/finance",
    "  Reviews — 10 featured + 1 pending + 1 rejected for /admin/review-approvals",
    "  Settings — demo UPI/bank and social links for payment + footer QA",
  ].join("\n");
}
