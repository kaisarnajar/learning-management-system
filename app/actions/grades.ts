"use server";

import { prisma } from "@/utils/prisma";
import { auth } from "@/services/auth";
import { revalidatePath } from "next/cache";
import { courseGradeInputSchema } from "@/utils/validations";
import { authorizeCourseManagement, loadForCourseManagement } from "@/services/course-authorization";
import {
  type GradeRecordInput,
  getCourseGradeCardsFromDb,
  getEnrolledStudentsForGradesFromDb,
  getGradeRecordsForGradeIdFromDb,
  saveCourseGradeToDb,
  getStudentGradeRecordsFromDb,
  deleteCourseGradeFromDb,
  getStudentGradeReportFromDb,
} from "@/services/grades";

export async function getCourseGradeCards(courseId: string) {
  await authorizeCourseManagement(courseId);
  return getCourseGradeCardsFromDb(courseId);
}

export async function getEnrolledStudentsForGrades(courseId: string) {
  await authorizeCourseManagement(courseId);
  return getEnrolledStudentsForGradesFromDb(courseId);
}

export async function getGradeRecordsForGradeId(courseId: string, gradeId: string) {
  await authorizeCourseManagement(courseId);
  return getGradeRecordsForGradeIdFromDb(courseId, gradeId);
}

export async function saveCourseGrade(
  gradeId: string | null,
  courseId: string,
  title: string,
  date: Date,
  maxMarks: number,
  records: GradeRecordInput[]
): Promise<{ error?: string }> {
  await authorizeCourseManagement(courseId);

  const parsed = courseGradeInputSchema.safeParse({ title, maxMarks, records });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid grade details." };
  }
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { error: "Please select a valid date." };
  }

  const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

  try {
    await saveCourseGradeToDb(
      gradeId,
      courseId,
      parsed.data.title,
      targetDate,
      parsed.data.maxMarks,
      parsed.data.records.map((r) => ({
        enrollmentId: r.enrollmentId,
        marksObtained: r.marksObtained === null ? null : Math.round(r.marksObtained * 100) / 100,
      })),
    );
  } catch (error) {
    console.error("saveCourseGrade error:", error);
    return { error: error instanceof Error ? error.message : "Failed to save grades." };
  }

  revalidatePath(`/admin/courses/${courseId}/grades`);
  revalidatePath(`/teacher/courses/${courseId}/grades`);
  revalidatePath(`/profile/courses/${courseId}`);
  return {};
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
  await authorizeCourseManagement(courseId);

  await deleteCourseGradeFromDb(courseId, gradeId);

  revalidatePath(`/admin/courses/${courseId}/grades`);
  revalidatePath(`/teacher/courses/${courseId}/grades`);
  revalidatePath(`/profile/courses/${courseId}`);
}

export async function getStudentGradeReport(enrollmentId: string) {
  return loadForCourseManagement(
    () => getStudentGradeReportFromDb(enrollmentId),
    (report) => report.course.teacherId,
  );
}
