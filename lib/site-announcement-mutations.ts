import {
  deleteAnnouncementImageFile,
  getAnnouncementImageFiles,
  MAX_ANNOUNCEMENT_IMAGES,
  saveAnnouncementImage,
  validateAnnouncementImage,
} from "@/lib/site-announcement-upload";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

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

  let sortOrder = existingCount;
  for (const file of files) {
    const validation = validateAnnouncementImage(file);
    if (validation.error) {
      return { error: validation.error };
    }

    const imagePath = await saveAnnouncementImage(announcementId, file);
    await withDbErrorHandling(() => prisma.siteAnnouncementImage.create({
          data: {
            siteAnnouncementId: announcementId,
            imagePath,
            sortOrder: sortOrder++,
          },
        }), "Database operation failed");
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
  for (const img of toRemove) {
    await deleteAnnouncementImageFile(img.imagePath);
    await withDbErrorHandling(() => prisma.siteAnnouncementImage.delete({ where: { id: img.id } }), "Database operation failed");
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
