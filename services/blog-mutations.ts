import {
  deleteBlogImageFile,
  getBlogImageFiles,
  MAX_BLOG_IMAGES,
  saveBlogImage,
  validateBlogImage,
} from "@/services/blog-upload";
import { prisma } from "@/utils/prisma";
import { blogPostSchema, teacherBlogPostSchema } from "@/utils/validations";
import { sanitizeRichText } from "@/services/rich-text";
import { withDbErrorHandling } from "@/utils/db-error";
import { deleteManyFromR2, isUploadError } from "@/services/storage";

/** Rich-text bodies arrive as raw editor HTML; sanitise before validation and storage. */
function sanitizedBody(formData: FormData): string {
  const raw = formData.get("body");
  return sanitizeRichText(typeof raw === "string" ? raw : "");
}

export function parseBlogForm(formData: FormData) {
  return blogPostSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    body: sanitizedBody(formData),
    published: formData.get("published") === "on",
  });
}

export function parseTeacherBlogForm(formData: FormData) {
  return teacherBlogPostSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    body: sanitizedBody(formData),
  });
}

export function getRemoveImageIds(formData: FormData): string[] {
  return formData
    .getAll("removeImage")
    .map((v) => String(v))
    .filter(Boolean);
}

export async function addImagesToPost(blogPostId: string, formData: FormData, existingCount: number) {
  const files = getBlogImageFiles(formData);
  if (files.length === 0) return { error: undefined as string | undefined };

  if (existingCount + files.length > MAX_BLOG_IMAGES) {
    return {
      error: `A blog post can have at most ${MAX_BLOG_IMAGES} images. Remove some or upload fewer.`,
    };
  }

  // Validate every file before touching storage, so a bad third file does
  // not leave the first two behind.
  for (const file of files) {
    const validation = validateBlogImage(file);
    if (validation.error) {
      return { error: validation.error };
    }
  }

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      uploaded.push(await saveBlogImage(blogPostId, file));
    }
    await withDbErrorHandling(() => prisma.blogImage.createMany({
      data: uploaded.map((imagePath, index) => ({ blogPostId, imagePath, sortOrder: existingCount + index })),
    }), "Database operation failed");
  } catch (error) {
    // Nothing was recorded: remove whatever reached the bucket.
    await deleteManyFromR2("blogs", uploaded);
    if (isUploadError(error)) return { error: error.message };
    throw error;
  }

  return { error: undefined };
}

export async function removeBlogImages(imageIds: string[], postId: string) {
  const existing = await withDbErrorHandling(() => prisma.blogPost.findUnique({
      where: { id: postId },
      include: { images: true },
    }), "Database operation failed");
  if (!existing) return;

  const toRemove = existing.images.filter((img) => imageIds.includes(img.id));
  if (toRemove.length === 0) return;
  // Rows first; objects only once the rows are gone, so a failed delete never
  // leaves an image row pointing at a missing file.
  await withDbErrorHandling(() => prisma.blogImage.deleteMany({
    where: { id: { in: toRemove.map((img) => img.id) }, blogPostId: postId },
  }), "Database operation failed");
  for (const img of toRemove) {
    await deleteBlogImageFile(img.imagePath);
  }
}
