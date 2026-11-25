import sharp from "sharp";
import { UploadError, type StoredMime } from "@/services/storage";

/**
 * Public images (blog, announcement, book and library covers, profile
 * photos) are shown on phones, mostly over mobile data: an original photo
 * or a 2.5 MB PNG export is far more than any screen needs. Before a public
 * image is stored it is turned upright (EXIF orientation), shrunk to at most
 * MAX_IMAGE_EDGE on its long side (never enlarged) and re-encoded as WebP,
 * which also drops all metadata (camera, GPS). GIFs are kept as they are,
 * since they may be animated.
 */

export const MAX_IMAGE_EDGE = 1200;
export const WEBP_QUALITY = 80;

/** Public objects never change in place (every key is unique), so caches may keep them for a year. */
export const PUBLIC_OBJECT_CACHE_CONTROL = "public, max-age=31536000, immutable";

export type OptimizedImage = { buffer: Buffer; mime: StoredMime };

export function isOptimizableImage(mime: StoredMime): boolean {
  return mime === "image/jpeg" || mime === "image/png" || mime === "image/webp";
}

/**
 * The resized WebP for an image, or the bytes unchanged when the type is not
 * one that is re-encoded. Throws UploadError when the bytes cannot be decoded
 * (a truncated or corrupt file that only looks like an image).
 */
export async function optimizeImage(buffer: Buffer, mime: StoredMime): Promise<OptimizedImage> {
  if (!isOptimizableImage(mime)) return { buffer, mime };
  try {
    const output = await sharp(buffer)
      .rotate()
      .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    return { buffer: output, mime: "image/webp" };
  } catch {
    throw new UploadError("The image could not be read. Please choose another file.");
  }
}
