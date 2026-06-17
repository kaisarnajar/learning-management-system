import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function validateLibraryImage(file: File | null): { error?: string } {
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

export async function saveLibraryImage(libraryItemId: string, file: File): Promise<string> {
  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";

  const filename = `${libraryItemId}-${Date.now()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "library");
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/library/${filename}`;
}

export async function deleteLibraryImage(imagePath: string): Promise<void> {
  if (!imagePath || !imagePath.startsWith("/uploads/library/")) return;
  
  try {
    const filename = path.basename(imagePath);
    const fullPath = path.join(process.cwd(), "public", "uploads", "library", filename);
    await unlink(fullPath);
  } catch (error) {
    // Ignore error if file doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("Failed to delete library image:", error);
    }
  }
}
