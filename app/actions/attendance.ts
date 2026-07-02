"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getTeacherForSession } from "@/lib/teacher-auth";
import { revalidatePath } from "next/cache";
import {
  type AttendanceRecordInput,
  getCourseAttendanceDatesFromDb,
  getEnrolledStudentsForAttendanceFromDb,
  getAttendanceRecordsForDateFromDb,
  saveCourseAttendanceToDb,
  getStudentAttendanceRecordsFromDb,
  deleteCourseAttendanceFromDb,
  getStudentAttendanceReportFromDb
} from "@/lib/attendance";

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
