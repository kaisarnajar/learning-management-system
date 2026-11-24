import { revalidatePath } from "next/cache";
import { MAX_BLOG_IMAGES } from "@/services/blog-limits";
import { deleteUpload, deleteUploads, pendingUploadsOf, saveUpload, validatePendingUpload } from "@/services/uploads";
import { prisma } from "@/utils/prisma";
import { blogPostSchema, teacherBlogPostSchema } from "@/utils/validations";
import { sanitizeRichText } from "@/services/rich-text";
import { withDbErrorHandling } from "@/utils/db-error";
import { isUploadError } from "@/services/storage";
import { revalidatePublicContent } from "@/services/public-cache";

/** Cache invalidation after an admin changes a blog post: lists, the public blog and (when known) the post's pages. */
export function revalidateBlogPaths(postId?: string) {
  revalidatePath("/");

  revalidatePublicContent();
  revalidatePath("/blog");
  revalidatePath("/admin");
  revalidatePath("/admin/blogs");
  revalidatePath("/admin/blog-approvals");
  if (postId) {
    revalidatePath(`/blog/${postId}`);
    revalidatePath(`/admin/blog-approvals/${postId}`);
  }
  revalidatePath("/teacher/blogs");
}

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
  const files = pendingUploadsOf("blog-image", formData, "images");
  if (files.length === 0) return { error: undefined as string | undefined };

  if (existingCount + files.length > MAX_BLOG_IMAGES) {
    return {
      error: `A blog post can have at most ${MAX_BLOG_IMAGES} images. Remove some or upload fewer.`,
    };
  }

  // Validate every file before touching storage, so a bad third file does
  // not leave the first two behind.
  for (const file of files) {
    const validation = validatePendingUpload("blog-image", file, { requireFile: true });
    if (validation.error) {
      return { error: validation.error };
    }
  }

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      uploaded.push(await saveUpload("blog-image", blogPostId, file));
    }
    await withDbErrorHandling(() => prisma.blogImage.createMany({
      data: uploaded.map((imagePath, index) => ({ blogPostId, imagePath, sortOrder: existingCount + index })),
    }), "Database operation failed");
  } catch (error) {
    // Nothing was recorded: remove whatever reached the bucket.
    await deleteUploads("blog-image", uploaded);
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
    await deleteUpload("blog-image", img.imagePath);
  }
}
