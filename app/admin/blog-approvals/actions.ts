"use server";

import { adminReturnUrl } from "@/utils/admin-redirects";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { revalidateBlogPaths } from "@/services/blog-mutations";

export async function approveBlogPost(
  postId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const post = await withDbErrorHandling(() => prisma.blogPost.findUnique({ where: { id: postId } }), "Database operation failed");
  if (!post) return { error: "Blog post not found." };
  if (post.approvalStatus !== "PENDING") {
    return { error: "This post is no longer pending approval." };
  }

  await withDbErrorHandling(() => prisma.blogPost.update({
      where: { id: postId },
      data: { approvalStatus: "APPROVED", published: true },
    }), "Database operation failed");

  revalidateBlogPaths(postId);
  redirect(adminReturnUrl(returnTo, "/admin/blog-approvals", "approved"));
}

export async function rejectBlogPost(
  postId: string,
  returnTo?: string,
): Promise<{ error?: string }> {
  await requireAdmin();

  const post = await withDbErrorHandling(() => prisma.blogPost.findUnique({ where: { id: postId } }), "Database operation failed");
  if (!post) return { error: "Blog post not found." };
  if (post.approvalStatus !== "PENDING") {
    return { error: "This post is no longer pending approval." };
  }

  await withDbErrorHandling(() => prisma.blogPost.update({
      where: { id: postId },
      data: { approvalStatus: "REJECTED", published: false, featuredOnHomepage: false, featuredAt: null },
    }), "Database operation failed");

  revalidateBlogPaths(postId);
  redirect(adminReturnUrl(returnTo, "/admin/blog-approvals", "rejected"));
}
