import { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";

type Tx = Prisma.TransactionClient;

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Assigns the next sequential roll number for an enrollment inside an
 * existing transaction. No-op when the enrollment already has one.
 *
 * The course row is locked (SELECT ... FOR UPDATE) for the rest of the
 * transaction, so two approvals for the same course are serialised and
 * cannot both read the same MAX(rollNumber). The (courseId, rollNumber)
 * unique index remains the backstop.
 */
export async function assignRollNumberTx(tx: Tx, enrollmentId: string, courseId: string) {
  const existing = await tx.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { rollNumber: true },
  });

  if (existing?.rollNumber != null) {
    return; // Already assigned
  }

  await tx.$queryRaw`SELECT "id" FROM "Course" WHERE "id" = ${courseId} FOR UPDATE`;

  const maxRollResult = await tx.enrollment.aggregate({
    where: { courseId },
    _max: { rollNumber: true },
  });

  const nextRoll = (maxRollResult._max.rollNumber ?? 0) + 1;

  await tx.enrollment.update({
    where: { id: enrollmentId },
    data: { rollNumber: nextRoll },
  });
}

/**
 * Assigns a unique, sequential roll number for a student in a specific course.
 * Roll numbers start at 1. If the enrollment already has a roll number, it does nothing.
 * This should be called immediately when an enrollment becomes active (approved).
 * Retries once if a concurrent writer still won the unique index race.
 */
export async function assignRollNumber(enrollmentId: string, courseId: string) {
  try {
    await prisma.$transaction((tx) => assignRollNumberTx(tx, enrollmentId, courseId));
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    await prisma.$transaction((tx) => assignRollNumberTx(tx, enrollmentId, courseId));
  }
}

/**
 * Helper to format a roll number for display (e.g. pads to 2 digits: "01", "02").
 */
export function formatRollNumber(rollNumber: number | null | undefined): string {
  if (rollNumber == null) return "—";
  return String(rollNumber).padStart(2, "0");
}
