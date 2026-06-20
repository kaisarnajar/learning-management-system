import type { BlogApprovalStatus, BlogPost } from "@prisma/client";
import { clampPage, paginationArgs } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

function pendingBlogSearchWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(
    ["title"],
    [{ relation: "createdBy", fields: ["name", "email"] }],
    searchQuery,
  );
}

export const BLOG_PUBLIC_WHERE = {
  published: true,
  approvalStatus: "APPROVED" as const,
};

export function blogApprovalStatusLabel(
  status: BlogApprovalStatus,
  published = false,
): string {
  switch (status) {
    case "PENDING":
      return "Pending approval";
    case "APPROVED":
      return published ? "Published" : "Approved";
    case "REJECTED":
      return "Rejected";
    case "DRAFT":
    default:
      return "Draft";
  }
}

export function blogApprovalStatusClass(status: BlogApprovalStatus, published: boolean): string {
  if (status === "PENDING") return "bg-warning-bg text-warning-text";
  if (status === "REJECTED") return "bg-destructive-bg text-destructive-text";
  if (status === "DRAFT") return "bg-surface-muted-hover text-muted";
  if (published) return "bg-success-bg text-success-text";
  return "bg-info-bg text-info-text";
}

export function canTeacherEditBlogPost(post: Pick<BlogPost, "approvalStatus" | "createdById">, userId: string) {
  return post.createdById === userId;
}

/** Teachers may delete their own posts at any approval stage. */
export function canTeacherDeleteBlogPost(post: Pick<BlogPost, "createdById">, userId: string) {
  return post.createdById === userId;
}

/** Teacher submissions awaiting admin review — content is read-only for admins. */
export function isBlogPendingTeacherApproval(post: Pick<BlogPost, "approvalStatus">) {
  return post.approvalStatus === "PENDING";
}

export async function getPendingBlogApprovalCount() {
  return withDbErrorHandling(() => prisma.blogPost.count({ where: { approvalStatus: "PENDING" } }), "Database operation failed");
}

const pendingBlogInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  createdBy: { select: { name: true, email: true } },
} as const;

export async function getPendingBlogPostsForAdminPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
) {
  const where = andWhere({ approvalStatus: "PENDING" as const }, pendingBlogSearchWhere(searchQuery));
  const totalCount = await withDbErrorHandling(() => prisma.blogPost.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: pendingBlogInclude,
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}
