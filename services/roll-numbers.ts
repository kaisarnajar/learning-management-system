import type { Prisma } from "@prisma/client";
import { prisma } from "@/utils/prisma";

type Tx = Prisma.TransactionClient;

/**
 * Assigns the next sequential roll number for an enrollment inside an
 * existing transaction. No-op when the enrollment already has one.
 * (Row-level locking of the course is added in a later commit.)
 */
export async function assignRollNumberTx(tx: Tx, enrollmentId: string, courseId: string) {
  const existing = await tx.enrollment.findUnique({
    where: { id: enrollmentId },
    select: { rollNumber: true },
  });

  if (existing?.rollNumber != null) {
    return; // Already assigned
  }

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
 */
export async function assignRollNumber(enrollmentId: string, courseId: string) {
  await prisma.$transaction((tx) => assignRollNumberTx(tx, enrollmentId, courseId));
}

/**
 * Helper to format a roll number for display (e.g. pads to 2 digits: "01", "02").
 */
export function formatRollNumber(rollNumber: number | null | undefined): string {
  if (rollNumber == null) return "—";
  return String(rollNumber).padStart(2, "0");
}
