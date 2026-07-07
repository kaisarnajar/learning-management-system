import {
  deleteBlogImageFile,
  getBlogImageFiles,
  MAX_BLOG_IMAGES,
  saveBlogImage,
  validateBlogImage,
} from "@/services/blog-upload";
import { prisma } from "@/utils/prisma";
import { blogPostSchema, teacherBlogPostSchema } from "@/utils/validations";
import { withDbErrorHandling } from "@/utils/db-error";

export function parseBlogForm(formData: FormData) {
  return blogPostSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
    published: formData.get("published") === "on",
  });
}

export function parseTeacherBlogForm(formData: FormData) {
  return teacherBlogPostSchema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
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

  let sortOrder = existingCount;
  for (const file of files) {
    const validation = validateBlogImage(file);
    if (validation.error) {
      return { error: validation.error };
    }

    const imagePath = await saveBlogImage(blogPostId, file);
    await withDbErrorHandling(() => prisma.blogImage.create({
          data: {
            blogPostId,
            imagePath,
            sortOrder: sortOrder++,
          },
        }), "Database operation failed");
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
  for (const img of toRemove) {
    await deleteBlogImageFile(img.imagePath);
    await withDbErrorHandling(() => prisma.blogImage.delete({ where: { id: img.id } }), "Database operation failed");
  }
}
