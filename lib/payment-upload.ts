import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

import { FILE_CONFIG } from "@/config/constants/file";
const MAX_SCREENSHOT_BYTES = FILE_CONFIG.MAX_AVATAR_SIZE_BYTES;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validatePaymentScreenshot(file: File | null): { error?: string } {
  if (!file || file.size === 0) {
    return {};
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Screenshot must be a JPEG, PNG, WebP, or GIF image." };
  }

  if (file.size > MAX_SCREENSHOT_BYTES) {
    return { error: "Screenshot must be 2 MB or smaller." };
  }

  return {};
}

export async function savePaymentScreenshot(
  enrollmentId: string,
  file: File,
): Promise<string> {
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";

  const filename = `${enrollmentId}-${Date.now()}.${ext}`;
  const key = `uploads/payments/${filename}`;

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
