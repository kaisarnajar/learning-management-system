"use server";

import type { AttendanceRecordInput } from "@/services/attendance";
import * as records from "@/services/course-records";

// Server-action entry points for the attendance pages; the checks and the
// work live in services/course-records.ts.

export async function getCourseAttendanceDates(courseId: string) {
  return records.getCourseAttendanceDates(courseId);
}

export async function getEnrolledStudentsForAttendance(courseId: string) {
  return records.getEnrolledStudentsForAttendance(courseId);
}

export async function getAttendanceRecordsForDate(courseId: string, date: Date) {
  return records.getAttendanceRecordsForDate(courseId, date);
}

export async function saveCourseAttendance(courseId: string, date: Date, attendance: AttendanceRecordInput[]) {
  return records.saveCourseAttendance(courseId, date, attendance);
}

export async function getStudentAttendanceRecords(courseId: string) {
  return records.getStudentAttendanceRecords(courseId);
}

export async function deleteCourseAttendance(courseId: string, date: Date) {
  return records.deleteCourseAttendance(courseId, date);
}

export async function getStudentAttendanceReport(enrollmentId: string) {
  return records.getStudentAttendanceReport(enrollmentId);
}
