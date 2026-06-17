import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { MAX_BLOG_IMAGE_BYTES } from "@/lib/blog-limits";

export { MAX_BLOG_IMAGES, MAX_BLOG_IMAGE_BYTES } from "@/lib/blog-limits";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function validateBlogImage(file: File): { error?: string } {
  if (!file || file.size === 0) {
    return { error: "Empty file." };
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return { error: "Images must be JPEG, PNG, WebP, or GIF." };
  }

  if (file.size > MAX_BLOG_IMAGE_BYTES) {
    return { error: "Each image must be 5 MB or smaller." };
  }

  return {};
}

export function getBlogImageFiles(formData: FormData): File[] {
  const files = formData.getAll("images");
  return files.filter((f): f is File => f instanceof File && f.size > 0);
}

export async function saveBlogImage(blogPostId: string, file: File): Promise<string> {
  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  const storedName = `${blogPostId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "blogs");
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, storedName), buffer);

  return `/uploads/blogs/${storedName}`;
}

export async function deleteBlogImageFile(imagePath: string | null | undefined) {
  if (!imagePath || !imagePath.startsWith("/uploads/blogs/")) {
    return;
  }

  const filePath = path.join(process.cwd(), "public", imagePath);
  try {
    await unlink(filePath);
  } catch (error) {
    console.error("Caught error:", error);

    }
}
