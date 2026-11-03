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
import { isUploadError } from "@/services/storage";

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

type AttachmentResolution =
  | { kind: "keep" }
  | { kind: "error"; error: string }
  /** New object already stored; `previous` is removed only after the row update commits. */
  | { kind: "replace"; data: AttachmentFieldUpdate; previous: string | null }
  | { kind: "remove"; data: AttachmentFieldUpdate; previous: string };

/**
 * Uploads a new attachment (if any) BEFORE the row is touched and reports
 * what the caller must do after its update succeeds or fails. The old object
 * is never deleted before the new one is both stored and recorded.
 */
export async function resolveCourseAnnouncementAttachment(
  formData: FormData,
  announcementId: string,
  existing?: { attachmentPath: string | null; attachmentName: string | null },
): Promise<AttachmentResolution> {
  const upload = getCourseAnnouncementAttachmentFile(formData);
  const remove = formData.get("removeAttachment") === "1";

  if (upload) {
    const validation = validateAnnouncementAttachment(upload);
    if (validation.error) return { kind: "error", error: validation.error };
    try {
      const data = await saveAnnouncementAttachment(announcementId, upload);
      return { kind: "replace", data, previous: existing?.attachmentPath ?? null };
    } catch (error) {
      if (isUploadError(error)) return { kind: "error", error: error.message };
      throw error;
    }
  }

  if (remove && existing?.attachmentPath) {
    return { kind: "remove", data: { attachmentPath: null, attachmentName: null }, previous: existing.attachmentPath };
  }

  return { kind: "keep" };
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
  // Upload first so the row is written once, with its attachment; if the row
  // cannot be created the object is removed again.
  const saved = params.upload
    ? await saveAnnouncementAttachment(`${params.courseId}-${Date.now()}`, params.upload)
    : null;

  try {
    return await withDbErrorHandling(() => prisma.courseAnnouncement.create({
        data: {
          courseId: params.courseId,
          enrollmentId: params.enrollmentId,
          teacherId: params.teacherId,
          authorName: params.authorName,
          postedByAdmin: params.postedByAdmin,
          category: params.data.category,
          title: params.data.title,
          body: params.data.body,
          ...(saved ?? {}),
        },
      }), "Database operation failed");
  } catch (error) {
    if (saved) await deleteAnnouncementAttachment(saved.attachmentPath);
    throw error;
  }
}

export async function updateCourseAnnouncementRecord(
  announcementId: string,
  data: ParsedCourseAnnouncement,
  formData: FormData,
  existing: Pick<CourseAnnouncement, "attachmentPath" | "attachmentName">,
): Promise<{ error?: string }> {
  const attachment = await resolveCourseAnnouncementAttachment(formData, announcementId, existing);
  if (attachment.kind === "error") {
    return { error: attachment.error };
  }

  try {
    await withDbErrorHandling(() => prisma.courseAnnouncement.update({
        where: { id: announcementId },
        data: {
          category: data.category,
          title: data.title,
          body: data.body,
          ...(attachment.kind === "replace" || attachment.kind === "remove" ? attachment.data : {}),
        },
      }), "Database operation failed");
  } catch (error) {
    if (attachment.kind === "replace") await deleteAnnouncementAttachment(attachment.data.attachmentPath);
    throw error;
  }

  // The row now points at the new object (or none): the old one can go.
  if ((attachment.kind === "replace" || attachment.kind === "remove") && attachment.previous) {
    await deleteAnnouncementAttachment(attachment.previous);
  }

  return {};
}

export async function deleteCourseAnnouncementRecord(
  existing: Pick<CourseAnnouncement, "id" | "attachmentPath">,
) {
  await withDbErrorHandling(() => prisma.courseAnnouncement.delete({ where: { id: existing.id } }), "Database operation failed");
  await deleteAnnouncementAttachment(existing.attachmentPath);
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
