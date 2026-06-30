import { prisma } from "@/lib/prisma";

/**
 * Assigns a unique, sequential roll number for a student in a specific course.
 * Roll numbers start at 1. If the enrollment already has a roll number, it does nothing.
 * This should be called immediately when an enrollment becomes active (approved).
 */
export async function assignRollNumber(enrollmentId: string, courseId: string) {
  // Use a transaction to safely compute and assign the next roll number
  await prisma.$transaction(async (tx) => {
    // Check if the enrollment already has a roll number
    const existing = await tx.enrollment.findUnique({
      where: { id: enrollmentId },
      select: { rollNumber: true },
    });

    if (existing?.rollNumber != null) {
      return; // Already assigned
    }

    // Find the current maximum roll number for this course
    const maxRollResult = await tx.enrollment.aggregate({
      where: { courseId },
      _max: { rollNumber: true },
    });

    const nextRoll = (maxRollResult._max.rollNumber ?? 0) + 1;

    // Assign the new roll number
    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { rollNumber: nextRoll },
    });
  });
}

/**
 * Helper to format a roll number for display (e.g. pads to 2 digits: "01", "02").
 */
export function formatRollNumber(rollNumber: number | null | undefined): string {
  if (rollNumber == null) return "—";
  return String(rollNumber).padStart(2, "0");
}
