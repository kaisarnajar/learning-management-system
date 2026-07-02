"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getTeacherForSession } from "@/lib/teacher-auth";
import { revalidatePath } from "next/cache";
import {
  type GradeRecordInput,
  getCourseGradeCardsFromDb,
  getEnrolledStudentsForGradesFromDb,
  getGradeRecordsForGradeIdFromDb,
  saveCourseGradeToDb,
  getStudentGradeRecordsFromDb,
  deleteCourseGradeFromDb,
  getStudentGradeReportFromDb,
} from "@/lib/grades";

/** Helper to authorize Admin or the assigned Teacher of the course */
async function authorizeCourseGradeManagement(courseId: string) {
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

export async function getCourseGradeCards(courseId: string) {
  await authorizeCourseGradeManagement(courseId);
  return getCourseGradeCardsFromDb(courseId);
}

export async function getEnrolledStudentsForGrades(courseId: string) {
  await authorizeCourseGradeManagement(courseId);
  return getEnrolledStudentsForGradesFromDb(courseId);
}

export async function getGradeRecordsForGradeId(courseId: string, gradeId: string) {
  await authorizeCourseGradeManagement(courseId);
  return getGradeRecordsForGradeIdFromDb(gradeId);
}

export async function saveCourseGrade(
  gradeId: string | null,
  courseId: string,
  title: string,
  date: Date,
  maxMarks: number,
  records: GradeRecordInput[]
) {
  await authorizeCourseGradeManagement(courseId);
  const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  
  await saveCourseGradeToDb(gradeId, courseId, title, targetDate, maxMarks, records);

  revalidatePath(`/admin/courses/${courseId}/grades`);
  revalidatePath(`/teacher/courses/${courseId}/grades`);
  revalidatePath(`/profile/courses/${courseId}`);
}

export async function getStudentGradeRecords(courseId: string) {
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

  return getStudentGradeRecordsFromDb(enrollment.id);
}

export async function deleteCourseGrade(courseId: string, gradeId: string) {
  await authorizeCourseGradeManagement(courseId);

  await deleteCourseGradeFromDb(gradeId);

  revalidatePath(`/admin/courses/${courseId}/grades`);
  revalidatePath(`/teacher/courses/${courseId}/grades`);
  revalidatePath(`/profile/courses/${courseId}`);
}

export async function getStudentGradeReport(enrollmentId: string) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const report = await getStudentGradeReportFromDb(enrollmentId);

  if (!isAdminSession(session)) {
    const teacher = await getTeacherForSession(session);
    if (!teacher || report.course.teacherId !== teacher.id) {
      throw new Error("Forbidden");
    }
  }

  return report;
}
