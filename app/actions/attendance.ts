"use server";

import { prisma } from "@/utils/prisma";
import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { getTeacherForSession } from "@/services/teacher-auth";
import { revalidatePath } from "next/cache";
import { generateAttendanceCardPdf } from "@/utils/attendance-card-html";
import { sendAttendanceCardEmail } from "@/services/email";
import {
  type AttendanceRecordInput,
  getCourseAttendanceDatesFromDb,
  getEnrolledStudentsForAttendanceFromDb,
  getAttendanceRecordsForDateFromDb,
  saveCourseAttendanceToDb,
  getStudentAttendanceRecordsFromDb,
  deleteCourseAttendanceFromDb,
  getStudentAttendanceReportFromDb
} from "@/services/attendance";

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

export async function getCourseAttendanceDates(courseId: string) {
  await authorizeCourseAttendanceManagement(courseId);
  return getCourseAttendanceDatesFromDb(courseId);
}

export async function getEnrolledStudentsForAttendance(courseId: string) {
  await authorizeCourseAttendanceManagement(courseId);
  return getEnrolledStudentsForAttendanceFromDb(courseId);
}

export async function getAttendanceRecordsForDate(courseId: string, date: Date) {
  await authorizeCourseAttendanceManagement(courseId);
  const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return getAttendanceRecordsForDateFromDb(courseId, targetDate);
}

export async function saveCourseAttendance(courseId: string, date: Date, records: AttendanceRecordInput[]) {
  await authorizeCourseAttendanceManagement(courseId);
  const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  
  await saveCourseAttendanceToDb(courseId, targetDate, records);

  revalidatePath(`/admin/courses/${courseId}/attendance`);
  revalidatePath(`/teacher/courses/${courseId}/attendance`);
  revalidatePath(`/profile/courses/${courseId}`);
}

export async function getStudentAttendanceRecords(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      }
    }
  });

  if (!enrollment) throw new Error("Not enrolled in this course");

  return getStudentAttendanceRecordsFromDb(enrollment.id);
}

export async function deleteCourseAttendance(courseId: string, date: Date) {
  await authorizeCourseAttendanceManagement(courseId);
  const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  await deleteCourseAttendanceFromDb(courseId, targetDate);

  revalidatePath(`/admin/courses/${courseId}/attendance`);
  revalidatePath(`/teacher/courses/${courseId}/attendance`);
  revalidatePath(`/profile/courses/${courseId}`);
}

export async function getStudentAttendanceReport(enrollmentId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const report = await getStudentAttendanceReportFromDb(enrollmentId);

  if (!isAdminSession(session)) {
    const teacher = await getTeacherForSession(session);
    if (!teacher || report.course.teacherId !== teacher.id) {
      throw new Error("Forbidden");
    }
  }

  return report;
}

export async function sendAttendanceCardToEmailAction(enrollmentId: string): Promise<{ success?: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "DEVELOPER")) {
      return { error: "Unauthorized. Admin access required." };
    }

    if (!enrollmentId) {
      return { error: "enrollmentId is required." };
    }

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

    if (!enrollment) {
      return { error: "Enrollment not found." };
    }

    if (!enrollment.user.email) {
      return { error: "No email address found for this student." };
    }

    const course = await prisma.course.findUnique({
      where: { id: enrollment.courseId },
      select: { title: true }
    });

    if (!course) {
      return { error: "Course not found." };
    }

    const pdfBuffer = await generateAttendanceCardPdf(enrollmentId);
    const filename = `Attendance_Card_${enrollment.user.name?.replace(/\s+/g, '_') || "Student"}.pdf`;

    const emailResult = await sendAttendanceCardEmail({
      to: enrollment.user.email,
      studentName: enrollment.user.name || "Student",
      courseTitle: course.title,
      pdfBuffer,
      pdfFilename: filename,
    });

    if (emailResult.sent) {
      return { success: true };
    } else {
      return { error: emailResult.error || "Failed to send email." };
    }
  } catch (error) {
    console.error("sendAttendanceCardToEmailAction error:", error);
    return { error: "An unexpected error occurred while generating or sending the Attendance Card." };
  }
}
