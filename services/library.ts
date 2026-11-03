import type { LibraryItem as PrismaLibraryItem } from "@prisma/client";
import { isLibraryTopic } from "@/services/library-options";
import { resolveHomepageFeaturedUpdate } from "@/services/homepage-featured";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { andWhere, buildSearchOr } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";

function allLibraryItemsWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["title", "author", "topic"], [], searchQuery);
}

export const HOMEPAGE_FEATURED_RESOURCES_MAX = 4;

export type LibraryItem = PrismaLibraryItem;

function publishedLibraryWhere(topic?: string) {
  return {
    published: true,
    ...(topic && isLibraryTopic(topic) ? { topic } : {}),
  };
}

export async function getPublishedLibraryItemsPaginated(
  page: number,
  pageSize: number,
  topic?: string,
  searchQuery?: string,
): Promise<PaginatedResult<LibraryItem>> {
  const baseWhere = publishedLibraryWhere(topic);
  const searchWhere = allLibraryItemsWhere(searchQuery);
  const where = andWhere(baseWhere, searchWhere) || baseWhere;
  const totalCount = await withDbErrorHandling(() => prisma.libraryItem.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.libraryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getFeaturedHomepageLibraryItems(): Promise<LibraryItem[]> {
  const items = await withDbErrorHandling(() => prisma.libraryItem.findMany({
      where: { featuredOnHomepage: true, published: true },
      orderBy: [{ featuredAt: "desc" }, { updatedAt: "desc" }],
      take: HOMEPAGE_FEATURED_RESOURCES_MAX,
    }), "Database operation failed");
  return items;
}

export async function getFeaturedHomepageLibraryCount(): Promise<number> {
  return withDbErrorHandling(() => prisma.libraryItem.count({
      where: { featuredOnHomepage: true, published: true },
    }), "Database operation failed");
}

export async function resolveLibraryFeaturedUpdate(options: {
  item: Pick<LibraryItem, "published" | "featuredOnHomepage" | "featuredAt">;
  requestFeatured: boolean;
}) {
  const featuredCount = await getFeaturedHomepageLibraryCount();
  return resolveHomepageFeaturedUpdate({
    isEligible: options.item.published,
    requestFeatured: options.requestFeatured,
    currentlyFeatured: options.item.featuredOnHomepage,
    currentFeaturedAt: options.item.featuredAt,
    featuredCount,
    maxFeatured: HOMEPAGE_FEATURED_RESOURCES_MAX,
    resourceLabel: "resources",
  });
}

export async function getAllLibraryItemsPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<LibraryItem>> {
  const where = allLibraryItemsWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.libraryItem.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.libraryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getLibraryItemById(id: string): Promise<LibraryItem | null> {
  return withDbErrorHandling(() => prisma.libraryItem.findUnique({ where: { id } }), "Database operation failed");
}
