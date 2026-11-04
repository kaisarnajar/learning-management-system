"use server";

import { prisma } from "@/utils/prisma";
import { auth } from "@/services/auth";
import { revalidatePath } from "next/cache";
import { authorizeCourseManagement, loadForCourseManagement } from "@/services/course-authorization";
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

export async function getCourseAttendanceDates(courseId: string) {
  await authorizeCourseManagement(courseId);
  return getCourseAttendanceDatesFromDb(courseId);
}

export async function getEnrolledStudentsForAttendance(courseId: string) {
  await authorizeCourseManagement(courseId);
  return getEnrolledStudentsForAttendanceFromDb(courseId);
}

export async function getAttendanceRecordsForDate(courseId: string, date: Date) {
  await authorizeCourseManagement(courseId);
  const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return getAttendanceRecordsForDateFromDb(courseId, targetDate);
}

export async function saveCourseAttendance(courseId: string, date: Date, records: AttendanceRecordInput[]) {
  await authorizeCourseManagement(courseId);
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
  await authorizeCourseManagement(courseId);
  const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  await deleteCourseAttendanceFromDb(courseId, targetDate);

  revalidatePath(`/admin/courses/${courseId}/attendance`);
  revalidatePath(`/teacher/courses/${courseId}/attendance`);
  revalidatePath(`/profile/courses/${courseId}`);
}

export async function getStudentAttendanceReport(enrollmentId: string) {
  return loadForCourseManagement(
    () => getStudentAttendanceReportFromDb(enrollmentId),
    (report) => report.course.teacherId,
  );
}
