"use server";

import type { GradeRecordInput } from "@/services/grades";
import * as records from "@/services/course-records";

// Server-action entry points for the grade pages; the checks and the work
// live in services/course-records.ts.

export async function getCourseGradeCards(courseId: string) {
  return records.getCourseGradeCards(courseId);
}

export async function getEnrolledStudentsForGrades(courseId: string) {
  return records.getEnrolledStudentsForGrades(courseId);
}

export async function getGradeRecordsForGradeId(courseId: string, gradeId: string) {
  return records.getGradeRecordsForGradeId(courseId, gradeId);
}

export async function saveCourseGrade(
  gradeId: string | null,
  courseId: string,
  title: string,
  date: Date,
  maxMarks: number,
  grades: GradeRecordInput[],
): Promise<{ error?: string }> {
  return records.saveCourseGrade(gradeId, courseId, title, date, maxMarks, grades);
}

export async function getStudentGradeRecords(courseId: string) {
  return records.getStudentGradeRecords(courseId);
}

export async function deleteCourseGrade(courseId: string, gradeId: string) {
  return records.deleteCourseGrade(courseId, gradeId);
}

export async function getStudentGradeReport(enrollmentId: string) {
  return records.getStudentGradeReport(enrollmentId);
}
