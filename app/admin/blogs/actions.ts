"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth-actions";
import { deleteBlogImageFile } from "@/lib/blog-upload";
import { addImagesToPost, getRemoveImageIds, parseBlogForm, removeBlogImages } from "@/lib/blog-mutations";
import { isTeacherSubmittedBlog } from "@/lib/blog-approval";
import { resolveBlogFeaturedUpdate } from "@/lib/blogs";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

function adminListPath(suffix = "") {
  return `/admin/blogs${suffix}`;
}

function revalidateBlogPaths(postId?: string) {
  revalidatePath("/");
  revalidatePath("/blog");
  revalidatePath("/admin");
  revalidatePath("/admin/blogs");
  revalidatePath("/admin/blog-approvals");
  if (postId) {
    revalidatePath(`/blog/${postId}`);
  }
  revalidatePath("/teacher/blogs");
}

export async function createBlogPost(formData: FormData) {
  const session = await requireAdmin();
  const parsed = parseBlogForm(formData);

  if (!parsed.success) {
    redirect(
      adminListPath(`/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`),
    );
  }

  const published = parsed.data.published;
  const featuredOnHomepage = formData.get("featuredOnHomepage") === "on";
  const approvalStatus = published ? "APPROVED" : "DRAFT";

  const featured = await resolveBlogFeaturedUpdate({
    post: {
      published,
      approvalStatus,
      featuredOnHomepage: false,
      featuredAt: null,
    },
    requestFeatured: featuredOnHomepage,
  });

  if ("error" in featured) {
    redirect(adminListPath(`/new?error=${encodeURIComponent(featured.error)}`));
  }

  const post = await withDbErrorHandling(() => prisma.blogPost.create({
      data: {
        title: parsed.data.title,
        excerpt: parsed.data.excerpt || null,
        body: parsed.data.body,
        published,
        approvalStatus,
        ...featured,
        createdById: session.user.id,
      },
    }), "Database operation failed");

  const imageResult = await addImagesToPost(post.id, formData, 0);
  if (imageResult.error) {
    await withDbErrorHandling(() => prisma.blogPost.delete({ where: { id: post.id } }), "Database operation failed");
    redirect(adminListPath(`/new?error=${encodeURIComponent(imageResult.error)}`));
  }

  revalidateBlogPaths();
  redirect(adminListPath("?posted=1"));
}

export async function updateBlogPost(id: string, formData: FormData) {
  await requireAdmin();
  const parsed = parseBlogForm(formData);

  if (!parsed.success) {
    redirect(
      adminListPath(`/${id}/edit?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`),
    );
  }

  const existing = await withDbErrorHandling(() => prisma.blogPost.findUnique({
      where: { id },
      include: { images: true, createdBy: { select: { email: true } } },
    }), "Database operation failed");

  if (!existing) {
    redirect(adminListPath("?error=notfound"));
  }

  const contentLocked = isTeacherSubmittedBlog(existing);

  if (!contentLocked) {
    const removeIds = getRemoveImageIds(formData);
    await removeBlogImages(removeIds, id);

    const remainingCount =
      existing.images.length - existing.images.filter((img) => removeIds.includes(img.id)).length;

    const imageResult = await addImagesToPost(id, formData, remainingCount);
    if (imageResult.error) {
      redirect(adminListPath(`/${id}/edit?error=${encodeURIComponent(imageResult.error)}`));
    }
  }

  const published = parsed.data.published;
  const featuredOnHomepage = formData.get("featuredOnHomepage") === "on";
  const approvalStatus = published
    ? "APPROVED"
    : existing.approvalStatus === "APPROVED"
      ? "DRAFT"
      : existing.approvalStatus;

  const featured = await resolveBlogFeaturedUpdate({
    post: {
      published,
      approvalStatus,
      featuredOnHomepage: existing.featuredOnHomepage,
      featuredAt: existing.featuredAt,
    },
    requestFeatured: featuredOnHomepage,
  });

  if ("error" in featured) {
    redirect(adminListPath(`/${id}/edit?error=${encodeURIComponent(featured.error)}`));
  }

  await withDbErrorHandling(() => prisma.blogPost.update({
      where: { id },
      data: {
        title: contentLocked ? existing.title : parsed.data.title,
        excerpt: contentLocked ? existing.excerpt : parsed.data.excerpt || null,
        body: contentLocked ? existing.body : parsed.data.body,
        published,
        approvalStatus,
        ...featured,
      },
    }), "Database operation failed");

  revalidateBlogPaths(id);
  if (contentLocked) {
    redirect("/admin/blog-approvals?saved=1");
  }
  redirect(adminListPath("?saved=1"));
}

export async function deleteBlogPost(id: string) {
  await requireAdmin();

  const existing = await withDbErrorHandling(() => prisma.blogPost.findUnique({
      where: { id },
      include: { images: true },
    }), "Database operation failed");

  if (!existing) {
    redirect(adminListPath("?error=notfound"));
  }

  for (const img of existing.images) {
    await deleteBlogImageFile(img.imagePath);
  }

  await withDbErrorHandling(() => prisma.blogPost.delete({ where: { id } }), "Database operation failed");

  revalidateBlogPaths();
  redirect(adminListPath("?deleted=1"));
}
