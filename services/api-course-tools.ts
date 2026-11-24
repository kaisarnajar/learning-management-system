import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import type { CourseAnnouncement } from "@prisma/client";
import {
  ANNOUNCEMENT_CATEGORIES,
  announcementCategoryLabels,
  canTeacherManageCourseAnnouncement,
  getAnnouncementAuthorName,
  getAnnouncementForCourse,
  getCourseWideAnnouncementsForCoursePaginated,
  getStudentAnnouncementsForEnrollmentPaginated,
} from "@/services/announcements";
import {
  ADMIN_ROLES,
  TEACHER_ROLES,
  pagedBody,
  readActionForm,
  staffAction,
  staffListParams,
  staffRead,
  type StaffContext,
} from "@/services/api-staff";
import {
  createAdminCourseAnnouncement,
  createCourseAnnouncement,
  createStudentCourseAnnouncement,
  deleteAdminCourseAnnouncement,
  deleteCourseAnnouncement,
  deleteStudentCourseAnnouncement,
  updateAdminCourseAnnouncement,
  updateCourseAnnouncement,
  updateStudentCourseAnnouncement,
} from "@/services/course-announcement-actions";
import {
  deleteCourseAttendance,
  deleteCourseGrade,
  getAttendanceRecordsForDate,
  getCourseAttendanceDates,
  getCourseGradeCards,
  getEnrolledStudentsForAttendance,
  getEnrolledStudentsForGrades,
  getGradeRecordsForGradeId,
  getStudentAttendanceReport,
  getStudentGradeReport,
  saveCourseAttendance,
  saveCourseGrade,
} from "@/services/course-records";
import { courseStatusLabel } from "@/services/course-status";
import { getCourseById } from "@/services/courses";
import { CLASS_MEMBER_STATUSES, isEnrollmentInCourse } from "@/services/enrollments";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { formatRollNumber } from "@/services/roll-numbers";
import { sendStudentCardEmailAsAdmin, STUDENT_CARDS, type StudentCardKind } from "@/services/student-cards";
import { getTeacherCourseForPortal, getTeacherEnrollmentInCourse } from "@/services/teacher-portal";
import { apiError, readJson } from "@/utils/api-response";
import { formatCalendarDate, toDateInputValue } from "@/utils/calendar-date";
import { isDbError } from "@/utils/db-error";
import { pdfResponse } from "@/utils/pdf-response";
import { GRID_PAGE_SIZE } from "@/utils/pagination";

/**
 * The course tools the admin course pages (/admin/courses/[id]/…) and the teacher
 * portal (/teacher/courses/[id]/…) share: announcements, attendance, grade cards and
 * per-student reports. Each handler takes the portal ("admin" or "teacher"); the
 * route files under /api/v1/admin/courses and /api/v1/teacher/courses are thin
 * wrappers. Reads and writes call the same services (services/course-records.ts,
 * services/course-announcement-actions.ts) the shared page components use.
 */

export type CoursePortal = "admin" | "teacher";

export function portalRoles(portal: CoursePortal) {
  return portal === "admin" ? ADMIN_ROLES : TEACHER_ROLES;
}

/** The course when the caller may manage it (any course for admins, an assigned one for teachers); 404 otherwise. */
export async function requireManagedCourse(ctx: StaffContext, courseId: string) {
  const course = ctx.teacherId ? await getTeacherCourseForPortal(ctx.teacherId, courseId) : await getCourseById(courseId);
  if (!course) notFound();
  return course;
}

/** The course's header as both portals' course layouts show it. */
export function courseHeader(course: {
  id: string;
  title: string;
  status: Parameters<typeof courseStatusLabel>[0];
  category: string;
  level: string;
  startDate: string | null;
  duration: string | null;
}) {
  return {
    id: course.id,
    title: course.title,
    status: course.status,
    statusLabel: courseStatusLabel(course.status),
    category: course.category,
    level: course.level,
    startDate: course.startDate,
    duration: course.duration,
  };
}

function badRequest(message: string) {
  return apiError(message, 400);
}

/** A `YYYY-MM-DD` route segment or body field as the Date the attendance/grade actions take (UTC midnight). */
function parseCalendarDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function studentRow(e: { id: string; rollNumber: number | null; user: { name: string | null; email: string } }) {
  return { enrollmentId: e.id, rollNumber: e.rollNumber, rollNumberLabel: formatRollNumber(e.rollNumber), name: e.user.name, email: e.user.email };
}

function byRollNumber<T extends { rollNumber: number | null; name: string | null }>(a: T, b: T) {
  if (a.rollNumber !== b.rollNumber) {
    if (a.rollNumber == null) return 1;
    if (b.rollNumber == null) return -1;
    return a.rollNumber - b.rollNumber;
  }
  return (a.name ?? "").localeCompare(b.name ?? "");
}

// ------------------------------------------------------------------ announcements

type AnnouncementWithAuthor = CourseAnnouncement & { teacher: { name: string } | null };

function announcementJson(a: AnnouncementWithAuthor, ctx: StaffContext) {
  return {
    id: a.id,
    category: a.category,
    categoryLabel: announcementCategoryLabels[a.category],
    title: a.title,
    body: a.body,
    authorName: getAnnouncementAuthorName(a),
    postedByAdmin: a.postedByAdmin,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
    edited: a.updatedAt.getTime() - a.createdAt.getTime() > 1000,
    attachmentPath: a.attachmentPath,
    attachmentName: a.attachmentName,
    canManage: ctx.teacherId ? canTeacherManageCourseAnnouncement(a, ctx.teacherId) : true,
  };
}

/** Teacher per-student scope: the approved enrollment in the teacher's course, or 404. */
async function requireStudentScope(ctx: StaffContext, courseId: string, enrollmentId: string) {
  if (!ctx.teacherId) notFound();
  const data = await getTeacherEnrollmentInCourse(ctx.teacherId, courseId, enrollmentId);
  if (!data) notFound();
  return data;
}

export const ANNOUNCEMENT_CATEGORY_OPTIONS = ANNOUNCEMENT_CATEGORIES.map((value) => ({ value, label: announcementCategoryLabels[value] }));

/** Course-wide announcements, or a student's private messages when [enrollmentId] is given (teachers). `q` searches. */
export function listAnnouncements(request: NextRequest, portal: CoursePortal, courseId: string, enrollmentId?: string) {
  return staffRead(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/announcements`, async (ctx) => {
    const course = await requireManagedCourse(ctx, courseId);
    const student = enrollmentId ? (await requireStudentScope(ctx, courseId, enrollmentId)).enrollment : null;
    const { page, pageSize, q } = staffListParams(request, GRID_PAGE_SIZE);
    const { items, totalCount } = student
      ? await getStudentAnnouncementsForEnrollmentPaginated(student.id, page, pageSize)
      : await getCourseWideAnnouncementsForCoursePaginated(course.id, page, pageSize, q || undefined);
    return {
      ...pagedBody(items.map((a) => announcementJson(a, ctx)), totalCount, page, pageSize),
      course: courseHeader(course),
      student: student ? { enrollmentId: student.id, name: student.user.name?.trim() || student.user.email, email: student.user.email } : null,
      categories: ANNOUNCEMENT_CATEGORY_OPTIONS,
    };
  });
}

/** Posts an announcement (multipart: category, title, body, attachment). Students are e-mailed. */
export function createAnnouncement(request: NextRequest, portal: CoursePortal, courseId: string, enrollmentId?: string) {
  return staffAction(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/announcements POST`, async (ctx) => {
    await requireManagedCourse(ctx, courseId);
    if (enrollmentId) await requireStudentScope(ctx, courseId, enrollmentId);
    const form = await readActionForm(request);
    if (portal === "admin") return createAdminCourseAnnouncement(courseId, form);
    return enrollmentId ? createStudentCourseAnnouncement(courseId, enrollmentId, form) : createCourseAnnouncement(courseId, form);
  });
}

/** The announcement in scope, refusing (403) one a teacher may not change when [forChange]. */
async function loadAnnouncement(ctx: StaffContext, courseId: string, announcementId: string, enrollmentId: string | undefined, forChange: boolean) {
  await requireManagedCourse(ctx, courseId);
  if (enrollmentId) await requireStudentScope(ctx, courseId, enrollmentId);
  const announcement = await getAnnouncementForCourse(courseId, announcementId, { enrollmentId: enrollmentId ?? null });
  if (!announcement) notFound();
  if (forChange && ctx.teacherId && !canTeacherManageCourseAnnouncement(announcement, ctx.teacherId)) {
    return apiError("Only your own announcements can be edited or deleted. Academy admin posts are managed from the admin portal.", 403);
  }
  return announcement;
}

export function getAnnouncement(request: NextRequest, portal: CoursePortal, courseId: string, announcementId: string, enrollmentId?: string) {
  return staffRead(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/announcements/[announcementId]`, async (ctx) => {
    const announcement = await loadAnnouncement(ctx, courseId, announcementId, enrollmentId, false);
    if (announcement instanceof NextResponse) return announcement;
    return { announcement: announcementJson(announcement, ctx), categories: ANNOUNCEMENT_CATEGORY_OPTIONS };
  });
}

/** Edits an announcement (multipart: category, title, body, attachment to replace, removeAttachment=1). */
export function updateAnnouncement(request: NextRequest, portal: CoursePortal, courseId: string, announcementId: string, enrollmentId?: string) {
  return staffAction(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/announcements/[announcementId] PATCH`, async (ctx) => {
    const announcement = await loadAnnouncement(ctx, courseId, announcementId, enrollmentId, true);
    if (announcement instanceof NextResponse) return announcement;
    const form = await readActionForm(request);
    if (portal === "admin") return updateAdminCourseAnnouncement(courseId, announcementId, form);
    return enrollmentId
      ? updateStudentCourseAnnouncement(courseId, enrollmentId, announcementId, form)
      : updateCourseAnnouncement(courseId, announcementId, form);
  });
}

export function deleteAnnouncement(request: NextRequest, portal: CoursePortal, courseId: string, announcementId: string, enrollmentId?: string) {
  return staffAction(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/announcements/[announcementId] DELETE`, async (ctx) => {
    const announcement = await loadAnnouncement(ctx, courseId, announcementId, enrollmentId, true);
    if (announcement instanceof NextResponse) return announcement;
    if (portal === "admin") return deleteAdminCourseAnnouncement(courseId, announcementId);
    return enrollmentId
      ? deleteStudentCourseAnnouncement(courseId, enrollmentId, announcementId)
      : deleteCourseAnnouncement(courseId, announcementId);
  });
}

// ------------------------------------------------------------------ attendance

/** Attendance history: one row per day with present/absent counts. */
export function listAttendance(request: NextRequest, portal: CoursePortal, courseId: string) {
  return staffRead(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/attendance`, async (ctx) => {
    const course = await requireManagedCourse(ctx, courseId);
    const dates = await getCourseAttendanceDates(course.id);
    return {
      course: courseHeader(course),
      data: dates.map((d) => ({
        id: d.id,
        date: toDateInputValue(d.date),
        dateLabel: formatCalendarDate(d.date),
        present: d.records.length,
        absent: d._count.records - d.records.length,
        total: d._count.records,
      })),
    };
  });
}

/** Active students to mark (attendance form) or grade (grade form). */
export function listGradableStudents(request: NextRequest, portal: CoursePortal, courseId: string, kind: "attendance" | "grades") {
  return staffRead(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/${kind}/students`, async (ctx) => {
    const course = await requireManagedCourse(ctx, courseId);
    const students = kind === "attendance" ? await getEnrolledStudentsForAttendance(course.id) : await getEnrolledStudentsForGrades(course.id);
    return { data: students.map(studentRow) };
  });
}

/** One day's attendance (404 when none was taken that day). */
export function getAttendanceDay(request: NextRequest, portal: CoursePortal, courseId: string, date: string) {
  return staffRead(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/attendance/[date]`, async (ctx) => {
    await requireManagedCourse(ctx, courseId);
    const day = parseCalendarDate(date);
    if (!day) return badRequest("Use a date like 2026-11-24.");
    const attendance = await getAttendanceRecordsForDate(courseId, day);
    if (!attendance) notFound();
    const records = attendance.records
      .map((r) => ({ ...studentRow(r.enrollment), isPresent: r.isPresent }))
      .sort(byRollNumber);
    const present = records.filter((r) => r.isPresent).length;
    return {
      date: toDateInputValue(attendance.date),
      dateLabel: formatCalendarDate(attendance.date),
      present,
      absent: records.length - present,
      total: records.length,
      records,
    };
  });
}

/** Saves (creates or replaces) a day's attendance. JSON: `{ records: [{ enrollmentId, isPresent }] }`. */
export function saveAttendanceDay(request: NextRequest, portal: CoursePortal, courseId: string, date: string) {
  return staffAction(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/attendance/[date] PUT`, async (ctx) => {
    await requireManagedCourse(ctx, courseId);
    const day = parseCalendarDate(date);
    if (!day) return badRequest("Please select a date.");
    const body = await readJson(request);
    const raw = body?.records;
    if (!Array.isArray(raw)) return badRequest("records is required.");
    const records = raw.map((r) => r as { enrollmentId?: unknown; isPresent?: unknown });
    if (records.some((r) => typeof r.enrollmentId !== "string" || typeof r.isPresent !== "boolean")) {
      return badRequest("Each record needs an enrollmentId and isPresent (true or false).");
    }
    try {
      await saveCourseAttendance(courseId, day, records.map((r) => ({ enrollmentId: r.enrollmentId as string, isPresent: r.isPresent as boolean })));
    } catch (error) {
      // e.g. a student who no longer belongs to the course; the form shows the message.
      if (isDbError(error)) return badRequest(error.message);
      throw error;
    }
    return { date };
  });
}

export function deleteAttendanceDay(request: NextRequest, portal: CoursePortal, courseId: string, date: string) {
  return staffAction(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/attendance/[date] DELETE`, async (ctx) => {
    await requireManagedCourse(ctx, courseId);
    const day = parseCalendarDate(date);
    if (!day) return badRequest("Use a date like 2026-11-24.");
    if (!(await getAttendanceRecordsForDate(courseId, day))) notFound();
    await deleteCourseAttendance(courseId, day);
    return null;
  });
}

async function requireEnrollmentInCourse(ctx: StaffContext, courseId: string, enrollmentId: string) {
  const course = await requireManagedCourse(ctx, courseId);
  // Applicants who were never approved have no class record to show.
  if (!(await isEnrollmentInCourse(enrollmentId, course.id, { statuses: CLASS_MEMBER_STATUSES }))) notFound();
  return course;
}

/** A student's attendance across every session, with the summary the report page shows. */
export function getStudentAttendance(request: NextRequest, portal: CoursePortal, courseId: string, enrollmentId: string) {
  return staffRead(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/attendance/student/[enrollmentId]`, async (ctx) => {
    await requireEnrollmentInCourse(ctx, courseId, enrollmentId);
    const { enrollment, course, records } = await getStudentAttendanceReport(enrollmentId);
    const present = records.filter((r) => r.isPresent).length;
    const total = records.length;
    return {
      student: { enrollmentId, name: enrollment.user.name, email: enrollment.user.email, rollNumberLabel: formatRollNumber(enrollment.rollNumber) },
      courseTitle: course.title,
      summary: { total, present, absent: total - present, percentage: total === 0 ? 0 : Math.round((present / total) * 100) },
      records: records.map((r) => ({ id: r.id, date: toDateInputValue(r.attendance.date), dateLabel: formatCalendarDate(r.attendance.date), isPresent: r.isPresent })),
      canDownloadCard: portal === "admin",
    };
  });
}

// ------------------------------------------------------------------ grades

export function listGrades(request: NextRequest, portal: CoursePortal, courseId: string) {
  return staffRead(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/grades`, async (ctx) => {
    const course = await requireManagedCourse(ctx, courseId);
    const grades = await getCourseGradeCards(course.id);
    return {
      course: courseHeader(course),
      data: grades.map((g) => ({
        id: g.id,
        title: g.title,
        date: toDateInputValue(g.date),
        dateLabel: formatCalendarDate(g.date),
        maxMarks: g.maxMarks,
        graded: g._count.records,
      })),
    };
  });
}

type GradeBody = { title: string; date: Date; maxMarks: number; records: { enrollmentId: string; marksObtained: number | null }[] };

/** JSON `{ title, date: "YYYY-MM-DD", maxMarks, records: [{ enrollmentId, marksObtained | null }] }`; the action validates the rest. */
async function readGradeBody(request: NextRequest): Promise<GradeBody | NextResponse> {
  const body = await readJson(request);
  if (!body) return badRequest("Send the grade card as JSON.");
  const date = parseCalendarDate(body.date);
  if (!date) return badRequest("Please select a valid date.");
  if (!Array.isArray(body.records)) return badRequest("records is required.");
  const records = body.records.map((r) => r as { enrollmentId?: unknown; marksObtained?: unknown });
  if (records.some((r) => typeof r.enrollmentId !== "string" || (r.marksObtained !== null && r.marksObtained !== undefined && typeof r.marksObtained !== "number"))) {
    return badRequest("Each record needs an enrollmentId and marksObtained (a number, or null when not graded).");
  }
  return {
    title: typeof body.title === "string" ? body.title : "",
    date,
    maxMarks: typeof body.maxMarks === "number" ? body.maxMarks : Number(body.maxMarks),
    records: records.map((r) => ({ enrollmentId: r.enrollmentId as string, marksObtained: typeof r.marksObtained === "number" ? r.marksObtained : null })),
  };
}

/** Adds a test report (grade card) for the course. */
export function createGrade(request: NextRequest, portal: CoursePortal, courseId: string) {
  return staffAction(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/grades POST`, async (ctx) => {
    await requireManagedCourse(ctx, courseId);
    const body = await readGradeBody(request);
    if (body instanceof NextResponse) return body;
    return saveCourseGrade(null, courseId, body.title, body.date, body.maxMarks, body.records);
  });
}

/** One grade card with every student's marks, for the edit form. */
export function getGrade(request: NextRequest, portal: CoursePortal, courseId: string, gradeId: string) {
  return staffRead(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/grades/[gradeId]`, async (ctx) => {
    await requireManagedCourse(ctx, courseId);
    const grade = await getGradeRecordsForGradeId(courseId, gradeId);
    if (!grade) notFound();
    return {
      grade: {
        id: grade.id,
        title: grade.title,
        date: toDateInputValue(grade.date),
        dateLabel: formatCalendarDate(grade.date),
        maxMarks: grade.maxMarks,
        records: grade.records.map((r) => ({ ...studentRow(r.enrollment), marksObtained: r.marksObtained })).sort(byRollNumber),
      },
    };
  });
}

export function updateGrade(request: NextRequest, portal: CoursePortal, courseId: string, gradeId: string) {
  return staffAction(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/grades/[gradeId] PUT`, async (ctx) => {
    await requireManagedCourse(ctx, courseId);
    if (!(await getGradeRecordsForGradeId(courseId, gradeId))) notFound();
    const body = await readGradeBody(request);
    if (body instanceof NextResponse) return body;
    return saveCourseGrade(gradeId, courseId, body.title, body.date, body.maxMarks, body.records);
  });
}

export function deleteGrade(request: NextRequest, portal: CoursePortal, courseId: string, gradeId: string) {
  return staffAction(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/grades/[gradeId] DELETE`, async (ctx) => {
    await requireManagedCourse(ctx, courseId);
    if (!(await getGradeRecordsForGradeId(courseId, gradeId))) notFound();
    await deleteCourseGrade(courseId, gradeId);
    return null;
  });
}

/** A student's marks in every test, with the totals the report page shows (ungraded tests are left out of them). */
export function getStudentGrades(request: NextRequest, portal: CoursePortal, courseId: string, enrollmentId: string) {
  return staffRead(request, portalRoles(portal), `api/v1/${portal}/courses/[id]/grades/student/[enrollmentId]`, async (ctx) => {
    await requireEnrollmentInCourse(ctx, courseId, enrollmentId);
    const report = await getStudentGradeReport(enrollmentId);
    let obtained = 0;
    let max = 0;
    for (const r of report.records) {
      obtained += r.marksObtained;
      max += r.grade.maxMarks;
    }
    return {
      student: {
        enrollmentId,
        name: report.enrollment.user.name,
        email: report.enrollment.user.email,
        rollNumberLabel: formatRollNumber(report.enrollment.rollNumber),
      },
      courseTitle: report.course.title,
      summary: { exams: report.records.length, obtained, max, percentage: max === 0 ? 0 : Math.round((obtained / max) * 100) },
      records: report.records.map((r) => ({
        id: r.id,
        title: r.grade.title,
        date: toDateInputValue(r.grade.date),
        dateLabel: formatCalendarDate(r.grade.date),
        maxMarks: r.grade.maxMarks,
        marksObtained: r.marksObtained,
      })),
      canDownloadCard: portal === "admin",
    };
  });
}

// ------------------------------------------------------------------ student cards (admins)

/** The student's grade or attendance card as a PDF (admins; same as /api/student-card/[kind]). */
export function studentCardPdf(request: NextRequest, courseId: string, enrollmentId: string, kind: StudentCardKind) {
  return staffRead(request, ADMIN_ROLES, `api/v1/admin/courses/[id]/${kind}/student/[enrollmentId]/card`, async (ctx) => {
    const limited = await enforceRateLimit(RATE_LIMITS.DOCUMENT_USER, ctx.user.id);
    if (limited) return new NextResponse(limited.body, { status: limited.status, headers: limited.headers });
    await requireEnrollmentInCourse(ctx, courseId, enrollmentId);
    const card = STUDENT_CARDS[kind];
    const report = kind === "grade" ? await getStudentGradeReport(enrollmentId) : await getStudentAttendanceReport(enrollmentId);
    const pdf = await card.generatePdf(enrollmentId);
    return pdfResponse(pdf, `${card.label} ${report.enrollment.user.name?.trim() || "Student"}`, { inline: true });
  });
}

/** E-mails the card PDF to the student. */
export function emailStudentCard(request: NextRequest, courseId: string, enrollmentId: string, kind: StudentCardKind) {
  return staffAction(request, ADMIN_ROLES, `api/v1/admin/courses/[id]/${kind}/student/[enrollmentId]/card/email`, async (ctx) => {
    await requireEnrollmentInCourse(ctx, courseId, enrollmentId);
    return sendStudentCardEmailAsAdmin(kind, enrollmentId);
  });
}
