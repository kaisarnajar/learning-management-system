import type { BlogImage, BlogPost } from "@prisma/client";
import { BLOG_PUBLIC_WHERE } from "@/lib/blog-approval";
import { resolveHomepageFeaturedUpdate } from "@/lib/homepage-featured";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { buildSearchOr } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

function adminBlogPostsWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(
    ["title"],
    [{ relation: "createdBy", fields: ["name", "email"] }],
    searchQuery,
  );
}

export const HOMEPAGE_FEATURED_BLOGS_MAX = 4;

export type BlogPostWithImages = BlogPost & {
  images: BlogImage[];
  createdBy: { name: string | null; email?: string | null } | null;
};

export function formatBlogDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatBlogAuthorName(
  createdBy: { name: string | null; email?: string | null } | null,
): string {
  return createdBy?.name?.trim() || createdBy?.email?.trim() || "Darse Quran Academy";
}

export function isBlogPubliclyVisible(post: Pick<BlogPost, "published" | "approvalStatus">): boolean {
  return post.published && post.approvalStatus === "APPROVED";
}

export async function getFeaturedHomepageBlogPosts(): Promise<BlogPostWithImages[]> {
  const posts = await withDbErrorHandling(() => prisma.blogPost.findMany({
      where: { featuredOnHomepage: true },
      orderBy: [{ featuredAt: "desc" }, { updatedAt: "desc" }],
      take: HOMEPAGE_FEATURED_BLOGS_MAX,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { name: true } },
      },
    }), "Database operation failed");

  return posts.filter(isBlogPubliclyVisible);
}

export async function getFeaturedHomepageBlogCount(): Promise<number> {
  const posts = await withDbErrorHandling(() => prisma.blogPost.findMany({
      where: { featuredOnHomepage: true },
      select: { published: true, approvalStatus: true },
    }), "Database operation failed");
  return posts.filter(isBlogPubliclyVisible).length;
}

export async function resolveBlogFeaturedUpdate(options: {
  post: Pick<BlogPost, "published" | "approvalStatus" | "featuredOnHomepage" | "featuredAt">;
  requestFeatured: boolean;
}) {
  const featuredCount = await getFeaturedHomepageBlogCount();
  return resolveHomepageFeaturedUpdate({
    isEligible: isBlogPubliclyVisible(options.post),
    requestFeatured: options.requestFeatured,
    currentlyFeatured: options.post.featuredOnHomepage,
    currentFeaturedAt: options.post.featuredAt,
    featuredCount,
    maxFeatured: HOMEPAGE_FEATURED_BLOGS_MAX,
    resourceLabel: "blogs",
  });
}

const blogPostPublicInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  createdBy: { select: { name: true } },
} as const;

export async function getPublishedBlogPostsPaginated(
  page: number,
  pageSize: number,
): Promise<PaginatedResult<BlogPostWithImages>> {
  const totalCount = await withDbErrorHandling(() => prisma.blogPost.count({ where: BLOG_PUBLIC_WHERE }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.blogPost.findMany({
      where: BLOG_PUBLIC_WHERE,
      orderBy: { createdAt: "desc" },
      include: blogPostPublicInclude,
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getPublishedBlogPostById(id: string) {
  return withDbErrorHandling(() => prisma.blogPost.findFirst({
      where: { id, ...BLOG_PUBLIC_WHERE },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { name: true } },
      },
    }), "Database operation failed");
}

const blogPostAdminInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  createdBy: { select: { name: true, email: true } },
} as const;

export async function getAllBlogPostsForAdminPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<BlogPostWithImages>> {
  const where = adminBlogPostsWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.blogPost.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: blogPostAdminInclude,
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getBlogPostForAdmin(id: string) {
  return withDbErrorHandling(() => prisma.blogPost.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { name: true, email: true } },
      },
    }), "Database operation failed");
}

export async function getTeacherBlogPostsPaginated(
  userId: string,
  page: number,
  pageSize: number,
): Promise<PaginatedResult<BlogPostWithImages>> {
  const where = { createdById: userId };
  const totalCount = await withDbErrorHandling(() => prisma.blogPost.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.blogPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        createdBy: { select: { name: true, email: true } },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getBlogPostForTeacher(id: string, userId: string) {
  return withDbErrorHandling(() => prisma.blogPost.findFirst({
      where: { id, createdById: userId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
      },
    }), "Database operation failed");
}
