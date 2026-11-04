"use server";

import { redirect } from "next/navigation";
import type { CourseAnnouncement } from "@prisma/client";
import { requireAdmin, requireTeacher } from "@/services/auth-actions";
import { canTeacherManageCourseAnnouncement } from "@/services/announcements";
import {
  type ParsedCourseAnnouncement,
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
  const session = await requireAdmin();
  const course = await getCourseById(courseId);
  if (!course) {
    redirect("/admin/courses");
  }
  return { session, course };
}

function adminAuthorName(session: Awaited<ReturnType<typeof requireAdmin>>) {
  const name = session.user?.name?.trim();
  return name ? `${name} (Admin)` : "Academy Admin";
}

/** What `runAnnouncementMutation` needs to know about whoever is posting. */
type AnnouncementActor = {
  teacherId: string | null;
  authorName: string;
  postedByAdmin: boolean;
  /** Absent: the actor may change any announcement in scope (admins). */
  canManage?: (existing: Pick<CourseAnnouncement, "teacherId" | "postedByAdmin">) => boolean;
  notifyCreated: (announcement: { id: string }, data: ParsedCourseAnnouncement) => Promise<void>;
};

type AnnouncementMutation =
  | { kind: "create"; formData: FormData }
  | { kind: "update"; announcementId: string; formData: FormData }
  | { kind: "delete"; announcementId: string };

/**
 * Create/update/delete for course announcements and per-student messages, shared by the
 * teacher and admin portals. `redirectBase` is the portal's announcements list path; errors
 * and success flags are reported on it (or on `/new` / `/<id>/edit` for form errors).
 * Attachments are uploaded before the row is written and old objects are removed only
 * after the row commits (see course-announcement-mutations).
 */
async function runAnnouncementMutation({
  mutation,
  authorize,
  scope,
  redirectBase,
}: {
  mutation: AnnouncementMutation;
  authorize: () => Promise<AnnouncementActor>;
  scope: { courseId: string; enrollmentId: string | null };
  redirectBase: string;
}): Promise<never> {
  const { courseId, enrollmentId } = scope;
  const actor = await authorize();
  const revalidate = () =>
    enrollmentId
      ? revalidateStudentAnnouncementPaths(courseId, enrollmentId)
      : revalidateCourseAnnouncementPaths(courseId);

  if (mutation.kind === "create") {
    const newPath = `${redirectBase}/new`;
    const parsed = parseCourseAnnouncementFormOrError(mutation.formData);
    if (!parsed.ok) {
      redirectWithError(newPath, parsed.error);
    }

    const attachment = validateCreateCourseAnnouncementAttachment(mutation.formData);
    if (!attachment.ok) {
      redirectWithError(newPath, attachment.error);
    }

    const announcement = await createCourseAnnouncementRecord({
      courseId,
      enrollmentId,
      teacherId: actor.teacherId,
      authorName: actor.authorName,
      postedByAdmin: actor.postedByAdmin,
      data: parsed.data,
      upload: attachment.upload,
    });

    await actor.notifyCreated(announcement, parsed.data);

    revalidate();
    redirectWithSuccess(redirectBase, "posted");
  }

  const { announcementId } = mutation;
  let parsedUpdate: ParsedCourseAnnouncement | null = null;
  if (mutation.kind === "update") {
    const parsed = parseCourseAnnouncementFormOrError(mutation.formData);
    if (!parsed.ok) {
      redirectWithError(`${redirectBase}/${announcementId}/edit`, parsed.error);
    }
    parsedUpdate = parsed.data;
  }

  const existing = await getCourseAnnouncementRecord(announcementId, courseId, enrollmentId);
  if (!existing) {
    redirectWithError(redirectBase, "notfound");
  }
  if (actor.canManage && !actor.canManage(existing)) {
    redirectWithError(redirectBase, "forbidden");
  }

  if (mutation.kind === "update" && parsedUpdate) {
    const result = await updateCourseAnnouncementRecord(
      announcementId,
      parsedUpdate,
      mutation.formData,
      existing,
    );
    if (result.error) {
      redirectWithError(`${redirectBase}/${announcementId}/edit`, result.error);
    }
    revalidate();
    redirectWithSuccess(redirectBase, "saved");
  }

  await deleteCourseAnnouncementRecord(existing);
  revalidate();
  redirectWithSuccess(redirectBase, "deleted");
}

function teacherCourseMutation(courseId: string, mutation: AnnouncementMutation) {
  return runAnnouncementMutation({
    mutation,
    scope: { courseId, enrollmentId: null },
    redirectBase: `/teacher/courses/${courseId}/announcements`,
    authorize: async () => {
      const { teacher, course } = await requireTeacherCourse(courseId);
      return {
        teacherId: teacher.id,
        authorName: teacher.name,
        postedByAdmin: false,
        canManage: (existing) => canTeacherManageCourseAnnouncement(existing, teacher.id),
        notifyCreated: (announcement, data) =>
          notifyEnrolledStudentsOfCourseAnnouncement({
            courseId,
            courseTitle: course.title,
            announcementId: announcement.id,
            title: data.title,
            body: data.body,
          }),
      };
    },
  });
}

function teacherStudentMutation(courseId: string, enrollmentId: string, mutation: AnnouncementMutation) {
  return runAnnouncementMutation({
    mutation,
    scope: { courseId, enrollmentId },
    redirectBase: `/teacher/courses/${courseId}/students/${enrollmentId}/announcements`,
    authorize: async () => {
      const { teacher, course, enrollment } = await requireTeacherEnrollment(courseId, enrollmentId);
      return {
        teacherId: teacher.id,
        authorName: teacher.name,
        postedByAdmin: false,
        canManage: (existing) => canTeacherManageCourseAnnouncement(existing, teacher.id),
        notifyCreated: (announcement, data) =>
          notifyStudentOfPersonalMessage({
            userId: enrollment.userId,
            courseId,
            courseTitle: course.title,
            announcementId: announcement.id,
            title: data.title,
            body: data.body,
            teacherName: teacher.name,
          }),
      };
    },
  });
}

function adminCourseMutation(courseId: string, mutation: AnnouncementMutation) {
  return runAnnouncementMutation({
    mutation,
    scope: { courseId, enrollmentId: null },
    redirectBase: `/admin/courses/${courseId}/announcements`,
    authorize: async () => {
      const { session, course } = await requireAdminCourse(courseId);
      return {
        teacherId: null,
        authorName: adminAuthorName(session),
        postedByAdmin: true,
        notifyCreated: (announcement, data) =>
          notifyEnrolledStudentsOfCourseAnnouncement({
            courseId,
            courseTitle: course.title,
            announcementId: announcement.id,
            title: data.title,
            body: data.body,
          }),
      };
    },
  });
}

export async function createCourseAnnouncement(courseId: string, formData: FormData) {
  return teacherCourseMutation(courseId, { kind: "create", formData });
}

export async function updateCourseAnnouncement(
  courseId: string,
  announcementId: string,
  formData: FormData,
) {
  return teacherCourseMutation(courseId, { kind: "update", announcementId, formData });
}

export async function deleteCourseAnnouncement(courseId: string, announcementId: string) {
  return teacherCourseMutation(courseId, { kind: "delete", announcementId });
}

export async function createStudentCourseAnnouncement(
  courseId: string,
  enrollmentId: string,
  formData: FormData,
) {
  return teacherStudentMutation(courseId, enrollmentId, { kind: "create", formData });
}

export async function updateStudentCourseAnnouncement(
  courseId: string,
  enrollmentId: string,
  announcementId: string,
  formData: FormData,
) {
  return teacherStudentMutation(courseId, enrollmentId, { kind: "update", announcementId, formData });
}

export async function deleteStudentCourseAnnouncement(
  courseId: string,
  enrollmentId: string,
  announcementId: string,
) {
  return teacherStudentMutation(courseId, enrollmentId, { kind: "delete", announcementId });
}

export async function createAdminCourseAnnouncement(courseId: string, formData: FormData) {
  return adminCourseMutation(courseId, { kind: "create", formData });
}

export async function updateAdminCourseAnnouncement(
  courseId: string,
  announcementId: string,
  formData: FormData,
) {
  return adminCourseMutation(courseId, { kind: "update", announcementId, formData });
}

export async function deleteAdminCourseAnnouncement(courseId: string, announcementId: string) {
  return adminCourseMutation(courseId, { kind: "delete", announcementId });
}
