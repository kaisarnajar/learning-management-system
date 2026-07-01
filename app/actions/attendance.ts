"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getTeacherForSession } from "@/lib/teacher-auth";
import { withDbErrorHandling } from "@/lib/db-error";
import { revalidatePath } from "next/cache";

/** Helper to authorize Admin or the assigned Teacher of the course */
async function authorizeCourseAttendanceManagement(courseId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  if (isAdminSession(session)) return true;

  const teacher = await getTeacherForSession(session);
  if (teacher) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { teacherId: true },
    });
    if (course?.teacherId === teacher.id) {
      return true;
    }
  }

  throw new Error("Forbidden");
}

export type AttendanceRecordInput = {
  enrollmentId: string;
  isPresent: boolean;
};

export async function getCourseAttendanceDates(courseId: string) {
  await authorizeCourseAttendanceManagement(courseId);

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

export async function getEnrolledStudentsForAttendance(courseId: string) {
  await authorizeCourseAttendanceManagement(courseId);

  return withDbErrorHandling(async () => {
    return prisma.enrollment.findMany({
      where: {
        courseId,
        status: "approved", // Only approved students
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

export async function getAttendanceRecordsForDate(courseId: string, date: Date) {
  await authorizeCourseAttendanceManagement(courseId);

  return withDbErrorHandling(async () => {
    // Get the start of the day in UTC for exact matching
    const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    const attendance = await prisma.courseAttendance.findUnique({
      where: {
        courseId_date: {
          courseId,
          date: targetDate,
        }
      },
      include: {
        records: true,
      }
    });

    return attendance;
  }, "Failed to fetch attendance records");
}

export async function saveCourseAttendance(courseId: string, date: Date, records: AttendanceRecordInput[]) {
  await authorizeCourseAttendanceManagement(courseId);

  return withDbErrorHandling(async () => {
    const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

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

    revalidatePath(`/admin/courses/${courseId}/attendance`);
    revalidatePath(`/teacher/courses/${courseId}/attendance`);
    revalidatePath(`/profile/courses/${courseId}`);

  }, "Failed to save attendance");
}

export async function getStudentAttendanceRecords(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  return withDbErrorHandling(async () => {
    // Check enrollment
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        }
      }
    });

    if (!enrollment) throw new Error("Not enrolled in this course");

    return prisma.courseAttendanceRecord.findMany({
      where: {
        enrollmentId: enrollment.id,
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
