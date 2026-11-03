import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

export type GradeRecordInput = {
  enrollmentId: string;
  marksObtained: number;
};

export async function getCourseGradeCardsFromDb(courseId: string) {
  return withDbErrorHandling(async () => {
    return prisma.courseGrade.findMany({
      where: { courseId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        title: true,
        date: true,
        maxMarks: true,
        _count: {
          select: {
            records: true,
          }
        },
      },
    });
  }, "Failed to fetch grade cards");
}

export async function getEnrolledStudentsForGradesFromDb(courseId: string) {
  return withDbErrorHandling(async () => {
    return prisma.enrollment.findMany({
      where: {
        courseId,
        status: "active", // Only active students
      },
      select: {
        id: true,
        rollNumber: true,
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      },
      orderBy: [
        { rollNumber: "asc" },
        { user: { name: "asc" } }
      ],
    });
  }, "Failed to fetch enrolled students");
}

/**
 * Ensures every enrollment id in `records` belongs to `courseId`. Callers
 * authorise on the course, so an id from another course must be rejected.
 */
async function assertEnrollmentsBelongToCourse(
  tx: Pick<typeof prisma, "enrollment">,
  courseId: string,
  enrollmentIds: string[],
) {
  const unique = [...new Set(enrollmentIds)];
  if (unique.length === 0) return;
  const found = await tx.enrollment.findMany({
    where: { courseId, id: { in: unique } },
    select: { id: true },
  });
  if (found.length !== unique.length) {
    throw new Error("One or more students do not belong to this course.");
  }
}

export async function getGradeRecordsForGradeIdFromDb(courseId: string, gradeId: string) {
  return withDbErrorHandling(async () => {
    return prisma.courseGrade.findFirst({
      where: { id: gradeId, courseId },
      include: {
        records: {
          include: {
            enrollment: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  }
                }
              }
            }
          }
        }
      }
    });
  }, "Failed to fetch grade records");
}

export async function saveCourseGradeToDb(
  gradeId: string | null,
  courseId: string,
  title: string,
  date: Date,
  maxMarks: number,
  records: GradeRecordInput[]
) {
  return withDbErrorHandling(async () => {
    await prisma.$transaction(async (tx) => {
      await assertEnrollmentsBelongToCourse(tx, courseId, records.map((r) => r.enrollmentId));

      let grade;

      if (gradeId) {
        // Scope the update to the authorised course; a gradeId from another
        // course must not be reachable.
        const updated = await tx.courseGrade.updateMany({
          where: { id: gradeId, courseId },
          data: { title, date, maxMarks },
        });
        if (updated.count === 0) {
          throw new Error("Grade card not found for this course.");
        }
        grade = { id: gradeId };
      } else {
        grade = await tx.courseGrade.create({
          data: { courseId, title, date, maxMarks },
        });
      }

      // Upsert individual records
      for (const record of records) {
        await tx.courseGradeRecord.upsert({
          where: {
            gradeId_enrollmentId: {
              gradeId: grade.id,
              enrollmentId: record.enrollmentId,
            }
          },
          create: {
            gradeId: grade.id,
            enrollmentId: record.enrollmentId,
            marksObtained: record.marksObtained,
          },
          update: {
            marksObtained: record.marksObtained,
          }
        });
      }
    });
  }, "Failed to save grades");
}

export async function getStudentGradeRecordsFromDb(enrollmentId: string) {
  return withDbErrorHandling(async () => {
    return prisma.courseGradeRecord.findMany({
      where: {
        enrollmentId,
      },
      include: {
        grade: {
          select: {
            title: true,
            date: true,
            maxMarks: true,
          }
        }
      },
      orderBy: {
        grade: {
          date: "desc",
        }
      }
    });
  }, "Failed to fetch student grades");
}

export async function deleteCourseGradeFromDb(courseId: string, gradeId: string) {
  return withDbErrorHandling(async () => {
    const deleted = await prisma.courseGrade.deleteMany({
      where: { id: gradeId, courseId },
    });
    if (deleted.count === 0) {
      throw new Error("Grade card not found for this course.");
    }
  }, "Failed to delete grade record");
}

export async function getStudentGradeReportFromDb(enrollmentId: string) {
  return withDbErrorHandling(async () => {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    });

    if (!enrollment) throw new Error("Enrollment not found");

    const course = await prisma.course.findUnique({
      where: { id: enrollment.courseId },
      select: {
        id: true,
        title: true,
        teacherId: true,
      }
    });

    if (!course) throw new Error("Course not found");

    const records = await prisma.courseGradeRecord.findMany({
      where: { enrollmentId },
      include: {
        grade: {
          select: {
            title: true,
            date: true,
            maxMarks: true,
          }
        }
      },
      orderBy: {
        grade: {
          date: "desc",
        }
      }
    });

    return {
      enrollment,
      course,
      records,
    };
  }, "Failed to fetch student grade report");
}
