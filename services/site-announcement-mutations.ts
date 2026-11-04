import {
  deleteAnnouncementImageFile,
  getAnnouncementImageFiles,
  MAX_ANNOUNCEMENT_IMAGES,
  saveAnnouncementImage,
  validateAnnouncementImage,
} from "@/services/site-announcement-upload";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { deleteManyFromR2, isUploadError } from "@/services/storage";

export function getRemoveAnnouncementImageIds(formData: FormData): string[] {
  return formData
    .getAll("removeImage")
    .map((v) => String(v))
    .filter(Boolean);
}

export async function addImagesToAnnouncement(announcementId: string, formData: FormData, existingCount: number) {
  const files = getAnnouncementImageFiles(formData);
  if (files.length === 0) return { error: undefined as string | undefined };

  if (existingCount + files.length > MAX_ANNOUNCEMENT_IMAGES) {
    return {
      error: `An announcement can have at most ${MAX_ANNOUNCEMENT_IMAGES} images. Remove some or upload fewer.`,
    };
  }

  for (const file of files) {
    const validation = validateAnnouncementImage(file);
    if (validation.error) {
      return { error: validation.error };
    }
  }

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      uploaded.push(await saveAnnouncementImage(announcementId, file));
    }
    await withDbErrorHandling(() => prisma.siteAnnouncementImage.createMany({
      data: uploaded.map((imagePath, index) => ({ siteAnnouncementId: announcementId, imagePath, sortOrder: existingCount + index })),
    }), "Database operation failed");
  } catch (error) {
    await deleteManyFromR2("announcements", uploaded);
    if (isUploadError(error)) return { error: error.message };
    throw error;
  }

  return { error: undefined };
}

export async function removeAnnouncementImages(imageIds: string[], announcementId: string) {
  const existing = await withDbErrorHandling(() => prisma.siteAnnouncement.findUnique({
      where: { id: announcementId },
      include: { images: true },
    }), "Database operation failed");
  if (!existing) return;

  const toRemove = existing.images.filter((img) => imageIds.includes(img.id));
  if (toRemove.length === 0) return;
  await withDbErrorHandling(() => prisma.siteAnnouncementImage.deleteMany({
    where: { id: { in: toRemove.map((img) => img.id) }, siteAnnouncementId: announcementId },
  }), "Database operation failed");
  for (const img of toRemove) {
    await deleteAnnouncementImageFile(img.imagePath);
  }
}

export async function createSiteAnnouncementRecord(data: {
  title: string;
  body: string;
  eventDate: string | null;
  location: string | null;
  showOnHomepage: boolean;
  published: boolean;
  createdById: string;
}) {
  return withDbErrorHandling(() => prisma.siteAnnouncement.create({ data }), "Database operation failed");
}

export async function updateSiteAnnouncementRecord(id: string, data: {
  title: string;
  body: string;
  eventDate: string | null;
  location: string | null;
  showOnHomepage: boolean;
  published: boolean;
}) {
  return withDbErrorHandling(() => prisma.siteAnnouncement.update({
    where: { id },
    data,
  }), "Database operation failed");
}

export async function toggleSiteAnnouncementHomepageRecord(id: string, showOnHomepage: boolean) {
  return withDbErrorHandling(() => prisma.siteAnnouncement.update({
    where: { id },
    data: { showOnHomepage },
  }), "Database operation failed");
}

export async function deleteSiteAnnouncementRecord(id: string) {
  return withDbErrorHandling(() => prisma.siteAnnouncement.delete({
    where: { id },
  }), "Database operation failed");
}
