import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/utils/s3";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

import { FILE_CONFIG } from "@/config/constants/file";
const MAX_IMAGE_BYTES = FILE_CONFIG.MAX_AVATAR_SIZE_BYTES; // 2MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateProfileImage(file: File | null): { error?: string } {
  if (!file || file.size === 0) {
    return {};
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Image must be a JPEG, PNG, WebP, or GIF file." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Image must be 2 MB or smaller." };
  }

  return {};
}

export async function saveProfileImage(userId: string, file: File): Promise<string> {
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";

  const filename = `${userId}-${Date.now()}.${ext}`;
  const key = `uploads/profiles/${filename}`;

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

export async function deleteProfileImage(imagePath: string): Promise<void> {
  if (!imagePath) return;

  let key = imagePath;
  if (key.startsWith(R2_PUBLIC_URL)) {
    key = key.slice(R2_PUBLIC_URL.length);
  }
  if (key.startsWith('/')) {
    key = key.slice(1);
  }

  if (!key.startsWith("uploads/profiles/")) {
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
    console.error("Failed to delete profile image from R2:", error);
  }
}
