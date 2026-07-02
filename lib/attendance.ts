import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export type AttendanceRecordInput = {
  enrollmentId: string;
  isPresent: boolean;
};

export async function getCourseAttendanceDatesFromDb(courseId: string) {
  return withDbErrorHandling(async () => {
    return prisma.courseAttendance.findMany({
      where: { courseId },
      orderBy: { date: "desc" },
      select: {
        id: true,
        date: true,
        _count: {
          select: {
            records: true,
          }
        },
        records: {
          where: { isPresent: true },
          select: { id: true }
        }
      },
    });
  }, "Failed to fetch attendance dates");
}

export async function getEnrolledStudentsForAttendanceFromDb(courseId: string) {
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

export async function getAttendanceRecordsForDateFromDb(courseId: string, targetDate: Date) {
  return withDbErrorHandling(async () => {
    return prisma.courseAttendance.findUnique({
      where: {
        courseId_date: {
          courseId,
          date: targetDate,
        }
      },
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
  }, "Failed to fetch attendance records");
}

export async function saveCourseAttendanceToDb(courseId: string, targetDate: Date, records: AttendanceRecordInput[]) {
  return withDbErrorHandling(async () => {
    await prisma.$transaction(async (tx) => {
      // Upsert the main attendance record
      const attendance = await tx.courseAttendance.upsert({
        where: {
          courseId_date: {
            courseId,
            date: targetDate,
          }
        },
        create: {
          courseId,
          date: targetDate,
        },
        update: {}, // Just touch it
      });

      // Upsert individual records
      for (const record of records) {
        await tx.courseAttendanceRecord.upsert({
          where: {
            attendanceId_enrollmentId: {
              attendanceId: attendance.id,
              enrollmentId: record.enrollmentId,
            }
          },
          create: {
            attendanceId: attendance.id,
            enrollmentId: record.enrollmentId,
            isPresent: record.isPresent,
          },
          update: {
            isPresent: record.isPresent,
          }
        });
      }
    });
  }, "Failed to save attendance");
}

export async function getStudentAttendanceRecordsFromDb(enrollmentId: string) {
  return withDbErrorHandling(async () => {
    return prisma.courseAttendanceRecord.findMany({
      where: {
        enrollmentId,
      },
      include: {
        attendance: {
          select: {
            date: true,
          }
        }
      },
      orderBy: {
        attendance: {
          date: "desc",
        }
      }
    });
  }, "Failed to fetch student attendance");
}

export async function deleteCourseAttendanceFromDb(courseId: string, targetDate: Date) {
  return withDbErrorHandling(async () => {
    await prisma.courseAttendance.delete({
      where: {
        courseId_date: {
          courseId,
          date: targetDate,
        }
      }
    });
  }, "Failed to delete attendance record");
}

export async function getStudentAttendanceReportFromDb(enrollmentId: string) {
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

    const records = await prisma.courseAttendanceRecord.findMany({
      where: { enrollmentId },
      include: {
        attendance: {
          select: {
            date: true,
          }
        }
      },
      orderBy: {
        attendance: {
          date: "desc",
        }
      }
    });

    return {
      enrollment,
      course,
      records,
    };
  }, "Failed to fetch student attendance report");
}
