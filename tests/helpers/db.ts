import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";

/**
 * Helpers for the suites that need a real Postgres (integration, API,
 * security). They run when DATABASE_URL_TEST is set (CI provides a Postgres
 * service; locally point it at a throwaway database) and are skipped
 * otherwise.
 */
export const HAS_TEST_DB = Boolean(process.env.DATABASE_URL_TEST);

/** `describe.skipIf(!HAS_TEST_DB)` reads better with this name at call sites. */
export const SKIP_WITHOUT_DB = !HAS_TEST_DB;

/** Empties every application table (not the Prisma migration ledger) and restarts identities. */
export async function resetDb(): Promise<void> {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  if (rows.length === 0) return;
  const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
}

let counter = 0;
const next = () => ++counter;

export async function createUser(overrides: Partial<Prisma.UserUncheckedCreateInput> = {}) {
  const n = next();
  return prisma.user.create({
    data: {
      name: `Student ${n}`,
      email: `student${n}-${randomUUID().slice(0, 8)}@example.test`,
      emailVerified: new Date(),
      gender: "MALE",
      ...overrides,
    },
  });
}

export async function createTeacher(overrides: Partial<Prisma.TeacherUncheckedCreateInput> = {}) {
  const n = next();
  return prisma.teacher.create({
    data: {
      id: `teacher-${n}-${randomUUID().slice(0, 8)}`,
      name: `Teacher ${n}`,
      specialization: "Tajweed",
      bio: "Experienced teacher of recitation.",
      initials: "T",
      ...overrides,
    },
  });
}

export async function createCourse(overrides: Partial<Prisma.CourseUncheckedCreateInput> = {}) {
  const n = next();
  return prisma.course.create({
    data: {
      id: `course-${n}-${randomUUID().slice(0, 8)}`,
      title: `Course ${n}`,
      description: "A course used by the tests.",
      startDate: "2026-04-01",
      duration: "6 months",
      level: "Beginner",
      category: "Quran",
      priceInrPaise: 50000,
      monthlyFeeInrPaise: 34900,
      feeFrequency: "MONTHLY",
      status: "ONGOING",
      ...overrides,
    },
  });
}

export async function createEnrollment(
  userId: string,
  courseId: string,
  overrides: Partial<Prisma.EnrollmentUncheckedCreateInput> = {},
) {
  return prisma.enrollment.create({
    data: {
      userId,
      courseId,
      status: "active",
      statusEnum: "ACTIVE",
      ...overrides,
    },
  });
}

export async function createBook(overrides: Partial<Prisma.BookUncheckedCreateInput> = {}) {
  const n = next();
  return prisma.book.create({
    data: {
      title: `Book ${n}`,
      author: "Author",
      description: "A book used by the tests.",
      priceInrPaise: 10000,
      inventoryPurchased: 5,
      weightInGrams: 200,
      ...overrides,
    },
  });
}

export async function setPaymentSettings(data: Partial<Prisma.PaymentSettingsUncheckedCreateInput> = {}) {
  return prisma.paymentSettings.upsert({
    where: { id: "default" },
    create: { id: "default", upiId: "academy@bank", ...data },
    update: data,
  });
}

/** An Auth.js-shaped session for the mocked `auth()`. */
export function sessionFor(user: { id: string; email: string; name?: string | null }, role: "ADMIN" | "STUDENT" | "TEACHER" | "DEVELOPER" = "ADMIN") {
  return {
    user: { id: user.id, email: user.email, name: user.name ?? null, role, emailVerified: new Date().toISOString() },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  };
}

/**
 * Runs a server action that ends in `redirect()`. Returns the redirect target
 * when it redirected, otherwise the action's return value.
 */
export async function runAction<T>(action: () => Promise<T>): Promise<{ redirectedTo: string | null; value: T | undefined }> {
  try {
    const value = await action();
    return { redirectedTo: null, value };
  } catch (error) {
    const digest = (error as { digest?: unknown } | null)?.digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      // digest: NEXT_REDIRECT;<type>;<url>;<status>;
      return { redirectedTo: digest.split(";")[2] ?? null, value: undefined };
    }
    throw error;
  }
}
