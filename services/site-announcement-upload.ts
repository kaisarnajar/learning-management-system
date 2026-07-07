import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/utils/s3";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const MAX_ANNOUNCEMENT_IMAGES = 5;
import { FILE_CONFIG } from "@/config/constants/file";
export const MAX_ANNOUNCEMENT_IMAGE_BYTES = FILE_CONFIG.MAX_IMAGE_SIZE_BYTES;

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateAnnouncementImage(file: File): { error?: string } {
  if (!file || file.size === 0) {
    return { error: "Empty file." };
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: "Images must be JPEG, PNG, WebP, or GIF." };
  }

  if (file.size > MAX_ANNOUNCEMENT_IMAGE_BYTES) {
    return { error: "Each image must be 5 MB or smaller." };
  }

  return {};
}

export function getAnnouncementImageFiles(formData: FormData): File[] {
  const files = formData.getAll("images");
  return files.filter((f): f is File => f instanceof File && f.size > 0);
}

export async function saveAnnouncementImage(announcementId: string, file: File): Promise<string> {
  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  const storedName = `${announcementId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
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

  return `${R2_PUBLIC_URL}/${key}`;
}

export async function deleteAnnouncementImageFile(imagePath: string | null | undefined) {
  if (!imagePath) return;
  
  let key = imagePath;
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
    console.error("Failed to delete announcement image from R2:", error);
  }
}
