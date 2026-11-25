import { revalidatePath } from "next/cache";
import { auth } from "@/services/auth";
import {
  type AttendanceRecordInput,
  deleteCourseAttendanceFromDb,
  getAttendanceRecordsForDateFromDb,
  getCourseAttendanceDatesFromDb,
  getEnrolledStudentsForAttendanceFromDb,
  getStudentAttendanceRecordsFromDb,
  getStudentAttendanceReportFromDb,
  saveCourseAttendanceToDb,
} from "@/services/attendance";
import { authorizeCourseManagement, loadForCourseManagement } from "@/services/course-authorization";
import {
  type GradeRecordInput,
  deleteCourseGradeFromDb,
  getCourseGradeCardsFromDb,
  getEnrolledStudentsForGradesFromDb,
  getGradeRecordsForGradeIdFromDb,
  getStudentGradeRecordsFromDb,
  getStudentGradeReportFromDb,
  saveCourseGradeToDb,
} from "@/services/grades";
import { courseGradeInputSchema } from "@/utils/validations";
import { prisma } from "@/utils/prisma";

/**
 * Attendance and grade cards of a course, for the admin course pages, the
 * teacher portal and the staff API. Each function checks the signed-in user
 * (an admin, or the course's teacher; a student for their own records)
 * before it reads or writes. app/actions/attendance.ts and grades.ts expose
 * them to the website's client components as server actions.
 */

/** The calendar day of [date] as UTC midnight, the key attendance and grades are stored under. */
function calendarDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function revalidateCourseRecordPaths(courseId: string, section: "attendance" | "grades") {
  revalidatePath(`/admin/courses/${courseId}/${section}`);
  revalidatePath(`/teacher/courses/${courseId}/${section}`);
  revalidatePath(`/profile/courses/${courseId}`);
}

/** The signed-in student's enrollment in the course; throws when there is none. */
async function ownEnrollmentId(courseId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  const userId = session.user.id;

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
  });

  if (!enrollment) throw new Error("Not enrolled in this course");
  return enrollment.id;
}

// ------------------------------------------------------------------ attendance

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
  return getAttendanceRecordsForDateFromDb(courseId, calendarDay(date));
}

export async function saveCourseAttendance(courseId: string, date: Date, records: AttendanceRecordInput[]) {
  await authorizeCourseManagement(courseId);
  await saveCourseAttendanceToDb(courseId, calendarDay(date), records);
  revalidateCourseRecordPaths(courseId, "attendance");
}

export async function getStudentAttendanceRecords(courseId: string) {
  return getStudentAttendanceRecordsFromDb(await ownEnrollmentId(courseId));
}

export async function deleteCourseAttendance(courseId: string, date: Date) {
  await authorizeCourseManagement(courseId);
  await deleteCourseAttendanceFromDb(courseId, calendarDay(date));
  revalidateCourseRecordPaths(courseId, "attendance");
}

export async function getStudentAttendanceReport(enrollmentId: string) {
  return loadForCourseManagement(
    () => getStudentAttendanceReportFromDb(enrollmentId),
    (report) => report.course.teacherId,
  );
}

// ------------------------------------------------------------------ grades

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
  records: GradeRecordInput[],
): Promise<{ error?: string }> {
  await authorizeCourseManagement(courseId);

  const parsed = courseGradeInputSchema.safeParse({ title, maxMarks, records });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid grade details." };
  }
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return { error: "Please select a valid date." };
  }

  try {
    await saveCourseGradeToDb(
      gradeId,
      courseId,
      parsed.data.title,
      calendarDay(date),
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

  revalidateCourseRecordPaths(courseId, "grades");
  return {};
}

export async function getStudentGradeRecords(courseId: string) {
  return getStudentGradeRecordsFromDb(await ownEnrollmentId(courseId));
}

export async function deleteCourseGrade(courseId: string, gradeId: string) {
  await authorizeCourseManagement(courseId);
  await deleteCourseGradeFromDb(courseId, gradeId);
  revalidateCourseRecordPaths(courseId, "grades");
}

export async function getStudentGradeReport(enrollmentId: string) {
  return loadForCourseManagement(
    () => getStudentGradeReportFromDb(enrollmentId),
    (report) => report.course.teacherId,
  );
}
