"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireTeacher } from "@/services/auth-actions";
import { canTeacherDeleteBlogPost, canTeacherEditBlogPost } from "@/services/blog-approval";
import {
  addImagesToPost,
  getRemoveImageIds,
  parseTeacherBlogForm,
  removeBlogImages,
} from "@/services/blog-mutations";
import { getBlogPostForTeacher } from "@/services/blogs";
import { deleteBlogImageFile } from "@/services/blog-upload";
import { prisma } from "@/utils/prisma";

function teacherListPath(suffix = "") {
  return `/teacher/blogs${suffix}`;
}

function revalidateBlogPaths() {
  revalidatePath("/blog");
  revalidatePath("/admin/blogs");
  revalidatePath("/admin/blog-approvals");
  revalidatePath("/teacher/blogs");
}

export async function createTeacherBlogPost(formData: FormData) {
  const { session } = await requireTeacher();
  const parsed = parseTeacherBlogForm(formData);

  if (!parsed.success) {
    redirect(
      teacherListPath(`/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`),
    );
  }

  const post = await prisma.blogPost.create({
    data: {
      title: parsed.data.title,
      excerpt: parsed.data.excerpt || null,
      body: parsed.data.body,
      published: false,
      approvalStatus: "PENDING",
      createdById: session.user.id,
    },
  });

  const imageResult = await addImagesToPost(post.id, formData, 0);
  if (imageResult.error) {
    await prisma.blogPost.delete({ where: { id: post.id } });
    redirect(teacherListPath(`/new?error=${encodeURIComponent(imageResult.error)}`));
  }

  revalidateBlogPaths();
  redirect(teacherListPath("?submitted=1"));
}

export async function updateTeacherBlogPost(id: string, formData: FormData) {
  const { session } = await requireTeacher();

  const parsed = parseTeacherBlogForm(formData);
  if (!parsed.success) {
    redirect(
      teacherListPath(`/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`),
    );
  }

  const existing = await getBlogPostForTeacher(id, session.user.id);
  if (!existing) {
    redirect(teacherListPath("?error=notfound"));
  }

  if (!canTeacherEditBlogPost(existing, session.user.id)) {
    redirect(teacherListPath("?error=locked"));
  }

  const removeIds = getRemoveImageIds(formData);
  await removeBlogImages(removeIds, id);

  const remainingCount =
    existing.images.length - existing.images.filter((img) => removeIds.includes(img.id)).length;

  const imageResult = await addImagesToPost(id, formData, remainingCount);
  if (imageResult.error) {
    redirect(teacherListPath(`/${id}/edit?error=${encodeURIComponent(imageResult.error)}`));
  }

  await prisma.blogPost.update({
    where: { id },
    data: {
      title: parsed.data.title,
      excerpt: parsed.data.excerpt || null,
      body: parsed.data.body,
      published: false,
      approvalStatus: "PENDING",
      featuredOnHomepage: false,
      featuredAt: null,
    },
  });

  revalidateBlogPaths();
  redirect(teacherListPath("?resubmitted=1"));
}

export async function deleteTeacherBlogPost(id: string) {
  const { session } = await requireTeacher();

  const existing = await getBlogPostForTeacher(id, session.user.id);
  if (!existing) {
    redirect(teacherListPath("?error=notfound"));
  }

  if (!canTeacherDeleteBlogPost(existing, session.user.id)) {
    redirect(teacherListPath("?error=notfound"));
  }

  for (const img of existing.images) {
    await deleteBlogImageFile(img.imagePath);
  }

  await prisma.blogPost.delete({ where: { id } });

  revalidateBlogPaths();
  redirect(teacherListPath("?deleted=1"));
}
