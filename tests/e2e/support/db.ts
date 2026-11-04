import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";

/** Credentials and ids of the fixtures the journeys rely on. */
export const FIXTURES = {
  password: "E2e-Password-1",
  admin: { email: "admin@e2e.test", name: "E2E Admin" },
  teacher: { email: "teacher@e2e.test", name: "E2E Teacher" },
  classmate: { email: "classmate@e2e.test", name: "E2E Classmate" },
  buyer: { email: "buyer@e2e.test", name: "E2E Buyer" },
  course: { id: "e2e-tajweed", title: "E2E Tajweed Course", enrollmentFeePaise: 50000 },
  book: { title: "E2E Noorani Qaida", pricePaise: 12000, shippingPaise: 4000 },
} as const;

export const AUTH_STATE = {
  admin: "tests/e2e/.auth/admin.json",
  teacher: "tests/e2e/.auth/teacher.json",
  buyer: "tests/e2e/.auth/buyer.json",
} as const;

let client: PrismaClient | null = null;

/** Prisma client for the disposable database (the app server has its own connection). */
export function db(): PrismaClient {
  const url = process.env.DATABASE_URL_TEST;
  if (!url) throw new Error("DATABASE_URL_TEST is not set.");
  client ??= new PrismaClient({ datasourceUrl: url });
  return client;
}

export async function disconnect(): Promise<void> {
  await client?.$disconnect();
  client = null;
}

export const hasDatabase = Boolean(process.env.DATABASE_URL_TEST);

export const COMPLETE_PROFILE = {
  fatherName: "E2E Father",
  dateOfBirth: new Date("1995-04-12"),
  occupation: "STUDENT" as const,
  address: "12 Example Street, Srinagar",
  whatsapp: "+919876543210",
  gender: "MALE" as const,
};

/** Empties every table except the migration ledger, then inserts the fixtures. */
export async function resetAndSeed(): Promise<void> {
  const prisma = db();
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  `;
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tables.map((t) => `"${t.tablename}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );

  const password = await hash(FIXTURES.password, 4);
  const verified = new Date();
  const account = (email: string, name: string, extra: Record<string, unknown> = {}) =>
    prisma.user.create({ data: { email, name, password, emailVerified: verified, ...extra } });

  await prisma.paymentSettings.create({
    data: {
      id: "default",
      upiId: "academy@bank",
      upiPayeeName: "E2E Academy",
      bankAccountName: "E2E Academy",
      bankName: "E2E Bank",
      bankAccountNumber: "123456789",
      bankIfsc: "E2E0000001",
      includeGstByDefault: false,
    },
  });

  await account(FIXTURES.admin.email, FIXTURES.admin.name);

  const teacherUser = await account(FIXTURES.teacher.email, FIXTURES.teacher.name);
  const teacher = await prisma.teacher.create({
    data: {
      id: "e2e-teacher",
      name: FIXTURES.teacher.name,
      email: FIXTURES.teacher.email,
      userId: teacherUser.id,
      specialization: "Tajweed",
      bio: "Teaches recitation for the end-to-end tests.",
      initials: "ET",
    },
  });

  await prisma.course.create({
    data: {
      id: FIXTURES.course.id,
      title: FIXTURES.course.title,
      description: "A course used by the end-to-end journeys.",
      startDate: "2026-04-01",
      duration: "6 months",
      level: "Beginner",
      category: "Quran",
      priceInrPaise: FIXTURES.course.enrollmentFeePaise,
      monthlyFeeInrPaise: 34900,
      feeFrequency: "MONTHLY",
      status: "ONGOING",
      teacherId: teacher.id,
    },
  });

  const classmate = await account(FIXTURES.classmate.email, FIXTURES.classmate.name, COMPLETE_PROFILE);
  await prisma.enrollment.create({
    data: { userId: classmate.id, courseId: FIXTURES.course.id, status: "active", statusEnum: "ACTIVE", rollNumber: 1 },
  });

  await account(FIXTURES.buyer.email, FIXTURES.buyer.name, COMPLETE_PROFILE);

  await prisma.book.create({
    data: {
      title: FIXTURES.book.title,
      author: "E2E Author",
      description: "A primer used by the end-to-end journeys.",
      priceInrPaise: FIXTURES.book.pricePaise,
      inventoryPurchased: 10,
      weightInGrams: 200,
    },
  });
  await prisma.shippingChargeSlab.create({ data: { minWeightGrams: 0, maxWeightGrams: 2000, chargeInrPaise: FIXTURES.book.shippingPaise } });
}
