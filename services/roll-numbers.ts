import { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";

type Tx = Prisma.TransactionClient;

/** DocumentSequence kind holding the last roll number issued per course (period = course id). */
const ROLL_SEQUENCE_KIND = "roll";

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/**
 * Assigns the next sequential roll number for an enrollment inside an
 * existing transaction. No-op when the enrollment already has one.
 *
 * The course row is locked (SELECT ... FOR UPDATE) for the rest of the
 * transaction, so two approvals for the same course are serialised and
 * cannot both read the same counter. The (courseId, rollNumber) unique index
 * remains the backstop.
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

  // Numbers are never handed out twice: the highest number ever issued for
  // the course is kept in DocumentSequence (kind "roll", period = course id),
  // so removing the last-numbered enrollment, or a re-application that
  // clears its number, does not make MAX(rollNumber) + 1 issue it again.
  // A course numbered before the counter existed starts from its highest number.
  const sequenceKey = { kind_period: { kind: ROLL_SEQUENCE_KIND, period: courseId } };
  const [maxRollResult, sequence] = await Promise.all([
    tx.enrollment.aggregate({ where: { courseId }, _max: { rollNumber: true } }),
    tx.documentSequence.findUnique({ where: sequenceKey, select: { next: true } }),
  ]);

  const nextRoll = Math.max(maxRollResult._max.rollNumber ?? 0, sequence?.next ?? 0) + 1;
  await tx.documentSequence.upsert({
    where: sequenceKey,
    create: { kind: ROLL_SEQUENCE_KIND, period: courseId, next: nextRoll },
    update: { next: nextRoll },
  });

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
