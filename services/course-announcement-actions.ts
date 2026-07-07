"use server";

import { redirect } from "next/navigation";
import { requireAdmin, requireTeacher } from "@/services/auth-actions";
import { canTeacherManageCourseAnnouncement } from "@/services/announcements";
import {
  createCourseAnnouncementRecord,
  deleteCourseAnnouncementRecord,
  parseCourseAnnouncementFormOrError,
  revalidateCourseAnnouncementPaths,
  revalidateStudentAnnouncementPaths,
  updateCourseAnnouncementRecord,
  validateCreateCourseAnnouncementAttachment,
  getCourseAnnouncementRecord,
} from "@/services/course-announcement-mutations";
import { getCourseById } from "@/services/courses";
import {
  notifyEnrolledStudentsOfCourseAnnouncement,
  notifyStudentOfPersonalMessage,
} from "@/services/notifications";
import { getTeacherCourseForPortal, getTeacherEnrollmentInCourse } from "@/services/teacher-portal";

function teacherCourseAnnouncementPath(courseId: string, suffix = "") {
  return `/teacher/courses/${courseId}/announcements${suffix}`;
}

function teacherStudentAnnouncementPath(courseId: string, enrollmentId: string, suffix = "") {
  return `/teacher/courses/${courseId}/students/${enrollmentId}/announcements${suffix}`;
}

function adminCourseAnnouncementPath(courseId: string, suffix = "") {
  return `/admin/courses/${courseId}/announcements${suffix}`;
}

function redirectWithError(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

function redirectWithSuccess(path: string, query: "posted" | "saved" | "deleted"): never {
  redirect(`${path}?${query}=1`);
}

async function requireTeacherCourse(courseId: string) {
  const { teacher } = await requireTeacher();
  const course = await getTeacherCourseForPortal(teacher.id, courseId);
  if (!course) {
    redirect("/teacher");
  }
  return { teacher, course };
}

async function requireTeacherEnrollment(courseId: string, enrollmentId: string) {
  const { teacher } = await requireTeacher();
  const data = await getTeacherEnrollmentInCourse(teacher.id, courseId, enrollmentId);
  if (!data) {
    redirect("/teacher");
  }
  return { teacher, ...data };
}

async function requireAdminCourse(courseId: string) {
  await requireAdmin();
  const course = await getCourseById(courseId);
  if (!course) {
    redirect("/admin/courses");
  }
  return course;
}

function adminAuthorName(session: Awaited<ReturnType<typeof requireAdmin>>) {
  const name = session.user?.name?.trim();
  return name ? `${name} (Admin)` : "Academy Admin";
}

export async function createCourseAnnouncement(courseId: string, formData: FormData) {
  const { teacher, course } = await requireTeacherCourse(courseId);
  const parsed = parseCourseAnnouncementFormOrError(formData);
  if (!parsed.ok) {
    redirectWithError(teacherCourseAnnouncementPath(courseId, "/new"), parsed.error);
  }

  const attachment = validateCreateCourseAnnouncementAttachment(formData);
  if (!attachment.ok) {
    redirectWithError(teacherCourseAnnouncementPath(courseId, "/new"), attachment.error);
  }

  const announcement = await createCourseAnnouncementRecord({
    courseId,
    enrollmentId: null,
    teacherId: teacher.id,
    authorName: teacher.name,
    postedByAdmin: false,
    data: parsed.data,
    upload: attachment.upload,
  });

  await notifyEnrolledStudentsOfCourseAnnouncement({
    courseId,
    courseTitle: course.title,
    announcementId: announcement.id,
    title: parsed.data.title,
    body: parsed.data.body,
  });

  revalidateCourseAnnouncementPaths(courseId);
  redirectWithSuccess(teacherCourseAnnouncementPath(courseId), "posted");
}

export async function updateCourseAnnouncement(
  courseId: string,
  announcementId: string,
  formData: FormData,
) {
  const { teacher } = await requireTeacherCourse(courseId);
  const parsed = parseCourseAnnouncementFormOrError(formData);
  if (!parsed.ok) {
    redirectWithError(
      teacherCourseAnnouncementPath(courseId, `/${announcementId}/edit`),
      parsed.error,
    );
  }

  const existing = await getCourseAnnouncementRecord(announcementId, courseId);
  if (!existing) {
    redirectWithError(teacherCourseAnnouncementPath(courseId), "notfound");
  }
  if (!canTeacherManageCourseAnnouncement(existing, teacher.id)) {
    redirectWithError(teacherCourseAnnouncementPath(courseId), "forbidden");
  }

  const result = await updateCourseAnnouncementRecord(
    announcementId,
    parsed.data,
    formData,
    existing,
  );
  if (result.error) {
    redirectWithError(teacherCourseAnnouncementPath(courseId, `/${announcementId}/edit`), result.error);
  }

  revalidateCourseAnnouncementPaths(courseId);
  redirectWithSuccess(teacherCourseAnnouncementPath(courseId), "saved");
}

export async function deleteCourseAnnouncement(courseId: string, announcementId: string) {
  const { teacher } = await requireTeacherCourse(courseId);

  const existing = await getCourseAnnouncementRecord(announcementId, courseId);
  if (!existing) {
    redirectWithError(teacherCourseAnnouncementPath(courseId), "notfound");
  }
  if (!canTeacherManageCourseAnnouncement(existing, teacher.id)) {
    redirectWithError(teacherCourseAnnouncementPath(courseId), "forbidden");
  }

  await deleteCourseAnnouncementRecord(existing);
  revalidateCourseAnnouncementPaths(courseId);
  redirectWithSuccess(teacherCourseAnnouncementPath(courseId), "deleted");
}

export async function createStudentCourseAnnouncement(
  courseId: string,
  enrollmentId: string,
  formData: FormData,
) {
  const { teacher, course, enrollment } = await requireTeacherEnrollment(courseId, enrollmentId);
  const parsed = parseCourseAnnouncementFormOrError(formData);
  if (!parsed.ok) {
    redirectWithError(teacherStudentAnnouncementPath(courseId, enrollmentId, "/new"), parsed.error);
  }

  const attachment = validateCreateCourseAnnouncementAttachment(formData);
  if (!attachment.ok) {
    redirectWithError(teacherStudentAnnouncementPath(courseId, enrollmentId, "/new"), attachment.error);
  }

  const announcement = await createCourseAnnouncementRecord({
    courseId,
    enrollmentId,
    teacherId: teacher.id,
    authorName: teacher.name,
    postedByAdmin: false,
    data: parsed.data,
    upload: attachment.upload,
  });

  await notifyStudentOfPersonalMessage({
    userId: enrollment.userId,
    courseId,
    courseTitle: course.title,
    announcementId: announcement.id,
    title: parsed.data.title,
    body: parsed.data.body,
    teacherName: teacher.name,
  });

  revalidateStudentAnnouncementPaths(courseId, enrollmentId);
  redirectWithSuccess(teacherStudentAnnouncementPath(courseId, enrollmentId), "posted");
}

export async function updateStudentCourseAnnouncement(
  courseId: string,
  enrollmentId: string,
  announcementId: string,
  formData: FormData,
) {
  const { teacher } = await requireTeacherEnrollment(courseId, enrollmentId);
  const parsed = parseCourseAnnouncementFormOrError(formData);
  if (!parsed.ok) {
    redirectWithError(
      teacherStudentAnnouncementPath(courseId, enrollmentId, `/${announcementId}/edit`),
      parsed.error,
    );
  }

  const existing = await getCourseAnnouncementRecord(announcementId, courseId, enrollmentId);
  if (!existing) {
    redirectWithError(teacherStudentAnnouncementPath(courseId, enrollmentId), "notfound");
  }
  if (!canTeacherManageCourseAnnouncement(existing, teacher.id)) {
    redirectWithError(teacherStudentAnnouncementPath(courseId, enrollmentId), "forbidden");
  }

  const result = await updateCourseAnnouncementRecord(
    announcementId,
    parsed.data,
    formData,
    existing,
  );
  if (result.error) {
    redirectWithError(
      teacherStudentAnnouncementPath(courseId, enrollmentId, `/${announcementId}/edit`),
      result.error,
    );
  }

  revalidateStudentAnnouncementPaths(courseId, enrollmentId);
  redirectWithSuccess(teacherStudentAnnouncementPath(courseId, enrollmentId), "saved");
}


export async function createAdminCourseAnnouncement(courseId: string, formData: FormData) {
  const session = await requireAdmin();
  const course = await requireAdminCourse(courseId);
  const parsed = parseCourseAnnouncementFormOrError(formData);
  if (!parsed.ok) {
    redirectWithError(adminCourseAnnouncementPath(courseId, "/new"), parsed.error);
  }

  const attachment = validateCreateCourseAnnouncementAttachment(formData);
  if (!attachment.ok) {
    redirectWithError(adminCourseAnnouncementPath(courseId, "/new"), attachment.error);
  }

  const announcement = await createCourseAnnouncementRecord({
    courseId,
    enrollmentId: null,
    teacherId: null,
    authorName: adminAuthorName(session),
    postedByAdmin: true,
    data: parsed.data,
    upload: attachment.upload,
  });

  await notifyEnrolledStudentsOfCourseAnnouncement({
    courseId,
    courseTitle: course.title,
    announcementId: announcement.id,
    title: parsed.data.title,
    body: parsed.data.body,
  });

  revalidateCourseAnnouncementPaths(courseId);
  redirectWithSuccess(adminCourseAnnouncementPath(courseId), "posted");
}

export async function updateAdminCourseAnnouncement(
  courseId: string,
  announcementId: string,
  formData: FormData,
) {
  await requireAdmin();
  await requireAdminCourse(courseId);
  const parsed = parseCourseAnnouncementFormOrError(formData);
  if (!parsed.ok) {
    redirectWithError(
      adminCourseAnnouncementPath(courseId, `/${announcementId}/edit`),
      parsed.error,
    );
  }

  const existing = await getCourseAnnouncementRecord(announcementId, courseId);
  if (!existing) {
    redirectWithError(adminCourseAnnouncementPath(courseId), "notfound");
  }

  const result = await updateCourseAnnouncementRecord(
    announcementId,
    parsed.data,
    formData,
    existing,
  );
  if (result.error) {
    redirectWithError(adminCourseAnnouncementPath(courseId, `/${announcementId}/edit`), result.error);
  }

  revalidateCourseAnnouncementPaths(courseId);
  redirectWithSuccess(adminCourseAnnouncementPath(courseId), "saved");
}

export async function deleteAdminCourseAnnouncement(courseId: string, announcementId: string) {
  await requireAdmin();
  await requireAdminCourse(courseId);

  const existing = await getCourseAnnouncementRecord(announcementId, courseId);
  if (!existing) {
    redirectWithError(adminCourseAnnouncementPath(courseId), "notfound");
  }

  await deleteCourseAnnouncementRecord(existing);
  revalidateCourseAnnouncementPaths(courseId);
  redirectWithSuccess(adminCourseAnnouncementPath(courseId), "deleted");
}
