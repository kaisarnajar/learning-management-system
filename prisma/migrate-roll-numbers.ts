import { PrismaClient } from "@prisma/client";
import { assignRollNumber } from "../lib/roll-numbers";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting backfill of roll numbers for existing students...");

  // Find all courses
  const courses = await prisma.course.findMany({ select: { id: true, title: true } });

  for (const course of courses) {
    console.log(`Processing course: ${course.title} (${course.id})`);

    // Find all active/completed enrollments without a roll number
    // We sort by updatedAt ascending to simulate approval order,
    // assuming updatedAt was set when status was changed to active/completed.
    // For admin enrollments, createdAt might be better, but updatedAt is generally safest for approvals.
    const enrollments = await prisma.enrollment.findMany({
      where: {
        courseId: course.id,
        status: { in: ["active", "completed"] },
        rollNumber: null,
      },
      orderBy: {
        updatedAt: "asc",
      },
      select: { id: true },
    });

    if (enrollments.length === 0) {
      console.log(`  No enrollments need roll numbers.`);
      continue;
    }

    console.log(`  Found ${enrollments.length} enrollments to backfill.`);

    for (const enrollment of enrollments) {
      // Use the transaction-safe assignRollNumber helper
      await assignRollNumber(enrollment.id, course.id);
    }
    
    console.log(`  Done assigning roll numbers for ${course.title}.`);
  }

  console.log("Backfill complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
