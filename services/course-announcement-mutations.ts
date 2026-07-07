import { revalidatePath } from "next/cache";
import type { CourseAnnouncement } from "@prisma/client";
import type { z } from "zod";
import {
  deleteAnnouncementAttachment,
  saveAnnouncementAttachment,
  validateAnnouncementAttachment,
} from "@/services/announcement-upload";
import { prisma } from "@/utils/prisma";
import { courseAnnouncementSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";

export type ParsedCourseAnnouncement = z.infer<typeof courseAnnouncementSchema>;

export function parseCourseAnnouncementForm(formData: FormData) {
  return courseAnnouncementSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
}

export function firstCourseAnnouncementFormError(message?: string) {
  return message ?? "Invalid input";
}

export function parseCourseAnnouncementFormOrError(formData: FormData):
  | { ok: true; data: ParsedCourseAnnouncement }
  | { ok: false; error: string } {
  const parsed = parseCourseAnnouncementForm(formData);
  if (!parsed.success) {
    return { ok: false, error: firstCourseAnnouncementFormError(parsed.error.issues[0]?.message) };
  }
  return { ok: true, data: parsed.data };
}

export function getCourseAnnouncementAttachmentFile(formData: FormData): File | null {
  const raw = formData.get("attachment");
  if (raw instanceof File && raw.size > 0) return raw;
  return null;
}

export function validateCreateCourseAnnouncementAttachment(formData: FormData):
  | { ok: true; upload: File | null }
  | { ok: false; error: string } {
  const upload = getCourseAnnouncementAttachmentFile(formData);
  if (!upload) {
    return { ok: true, upload: null };
  }

  const validation = validateAnnouncementAttachment(upload);
  if (validation.error) {
    return { ok: false, error: validation.error };
  }

  return { ok: true, upload };
}

export function revalidateCourseAnnouncementPaths(courseId: string) {
  revalidatePath(`/teacher/courses/${courseId}/announcements`);
  revalidatePath(`/admin/courses/${courseId}/announcements`);
  revalidatePath(`/profile/courses/${courseId}/announcements`);
}

export function revalidateStudentAnnouncementPaths(courseId: string, enrollmentId: string) {
  revalidatePath(`/teacher/courses/${courseId}/students/${enrollmentId}/announcements`);
  revalidatePath(`/profile/courses/${courseId}/announcements`);
}

type AttachmentFieldUpdate = {
  attachmentPath: string | null;
  attachmentName: string | null;
};

export async function resolveCourseAnnouncementAttachment(
  formData: FormData,
  announcementId: string,
  existing?: { attachmentPath: string | null; attachmentName: string | null },
): Promise<AttachmentFieldUpdate | { error: string } | undefined> {
  const upload = getCourseAnnouncementAttachmentFile(formData);
  const remove = formData.get("removeAttachment") === "1";

  if (upload) {
    const validation = validateAnnouncementAttachment(upload);
    if (validation.error) return { error: validation.error };
    if (existing?.attachmentPath) {
      await deleteAnnouncementAttachment(existing.attachmentPath);
    }
    return saveAnnouncementAttachment(announcementId, upload);
  }

  if (remove && existing?.attachmentPath) {
    await deleteAnnouncementAttachment(existing.attachmentPath);
    return { attachmentPath: null, attachmentName: null };
  }

  return undefined;
}

export async function createCourseAnnouncementRecord(params: {
  courseId: string;
  enrollmentId: string | null;
  teacherId: string | null;
  authorName: string;
  postedByAdmin: boolean;
  data: ParsedCourseAnnouncement;
  upload: File | null;
}) {
  const announcement = await withDbErrorHandling(() => prisma.courseAnnouncement.create({
      data: {
        courseId: params.courseId,
        enrollmentId: params.enrollmentId,
        teacherId: params.teacherId,
        authorName: params.authorName,
        postedByAdmin: params.postedByAdmin,
        category: params.data.category,
        title: params.data.title,
        body: params.data.body,
      },
    }), "Database operation failed");

  if (params.upload) {
    const saved = await saveAnnouncementAttachment(announcement.id, params.upload);
    await withDbErrorHandling(() => prisma.courseAnnouncement.update({
          where: { id: announcement.id },
          data: saved,
        }), "Database operation failed");
  }

  return announcement;
}

export async function updateCourseAnnouncementRecord(
  announcementId: string,
  data: ParsedCourseAnnouncement,
  formData: FormData,
  existing: Pick<CourseAnnouncement, "attachmentPath" | "attachmentName">,
): Promise<{ error?: string }> {
  const attachmentUpdate = await resolveCourseAnnouncementAttachment(formData, announcementId, existing);
  if (attachmentUpdate && "error" in attachmentUpdate) {
    return { error: attachmentUpdate.error };
  }

  await withDbErrorHandling(() => prisma.courseAnnouncement.update({
      where: { id: announcementId },
      data: {
        category: data.category,
        title: data.title,
        body: data.body,
        ...(attachmentUpdate && !("error" in attachmentUpdate) ? attachmentUpdate : {}),
      },
    }), "Database operation failed");

  return {};
}

export async function deleteCourseAnnouncementRecord(
  existing: Pick<CourseAnnouncement, "id" | "attachmentPath">,
) {
  await deleteAnnouncementAttachment(existing.attachmentPath);
  await withDbErrorHandling(() => prisma.courseAnnouncement.delete({ where: { id: existing.id } }), "Database operation failed");
}

export async function getCourseAnnouncementRecord(
  id: string,
  courseId: string,
  enrollmentId: string | null = null,
) {
  return withDbErrorHandling(() => prisma.courseAnnouncement.findFirst({
    where: { id, courseId, enrollmentId },
  }), "Database operation failed");
}
