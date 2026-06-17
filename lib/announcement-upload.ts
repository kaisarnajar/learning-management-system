import { isAnnouncementAttachmentTooLarge } from "@/lib/announcements";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export function validateAnnouncementAttachment(file: File | null): { error?: string } {
  if (!file || file.size === 0) {
    return {};
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return {
      error: "Attachment must be a PDF, Word document, or image (JPEG, PNG, WebP, GIF).",
    };
  }

  if (isAnnouncementAttachmentTooLarge(file.size)) {
    return { error: "Attachment must be 10 MB or smaller." };
  }

  return {};
}

function sanitizeFilename(name: string): string {
  const base = name.replace(/[/\\?%*:|"<>]/g, "_").trim();
  return base.slice(0, 120) || "attachment";
}

export async function saveAnnouncementAttachment(
  announcementId: string,
  file: File,
): Promise<{ attachmentPath: string; attachmentName: string }> {
  const ext = EXT_BY_TYPE[file.type] ?? "bin";
  const storedName = `${announcementId}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "announcements");
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  return {
    attachmentPath: `/uploads/announcements/${storedName}`,
    attachmentName: sanitizeFilename(file.name),
  };
}

export async function deleteAnnouncementAttachment(attachmentPath: string | null | undefined) {
  if (!attachmentPath || !attachmentPath.startsWith("/uploads/announcements/")) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", attachmentPath);
  try {
    await unlink(filePath);
  } catch (error) {
    console.error("Caught error:", error);

    }
}
