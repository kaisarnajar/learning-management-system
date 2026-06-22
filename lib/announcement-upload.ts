import { isAnnouncementAttachmentTooLarge } from "@/lib/announcements";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/s3";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
  const key = `uploads/announcements/${storedName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    })
  );

  return {
    attachmentPath: `${R2_PUBLIC_URL}/${key}`,
    attachmentName: sanitizeFilename(file.name),
  };
}

export async function deleteAnnouncementAttachment(attachmentPath: string | null | undefined) {
  if (!attachmentPath) return;

  let key = attachmentPath;
  if (key.startsWith(R2_PUBLIC_URL)) {
    key = key.slice(R2_PUBLIC_URL.length);
  }
  if (key.startsWith('/')) {
    key = key.slice(1);
  }

  if (!key.startsWith("uploads/announcements/")) {
    return;
  }

  try {
    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
  } catch (error) {
    console.error("Failed to delete announcement attachment from R2:", error);
  }
}
