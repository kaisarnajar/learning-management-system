import type { SiteAnnouncement } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";

function siteAnnouncementAdminWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["title", "location", "body"], [], searchQuery);
}

/** Maximum announcements featured on the homepage. */
export const HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX = 4;

export type SiteAnnouncementPublic = SiteAnnouncement & {
  createdBy: { name: string | null } | null;
  images: { id: string; imagePath: string; caption: string | null }[];
};

export function formatSiteAnnouncementDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const siteAnnouncementPublicInclude = {
  createdBy: { select: { name: true } },
  images: { select: { id: true, imagePath: true, caption: true }, orderBy: { sortOrder: 'asc' as const } },
} as const;

export async function getPublishedSiteAnnouncementsPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<SiteAnnouncementPublic>> {
  const baseWhere = { published: true };
  const searchWhere = searchQuery ? buildSearchOr(["title", "location", "body"], [], searchQuery) : undefined;
  const where = andWhere(baseWhere, searchWhere) || baseWhere;
  const totalCount = await withDbErrorHandling(() => prisma.siteAnnouncement.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.siteAnnouncement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: siteAnnouncementPublicInclude,
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getHomepageSiteAnnouncements(
  limit = HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX,
) {
  return withDbErrorHandling(() => prisma.siteAnnouncement.findMany({
      where: { published: true, showOnHomepage: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        createdBy: { select: { name: true } },
        images: { select: { id: true, imagePath: true, caption: true }, orderBy: { sortOrder: 'asc' } },
      },
    }), "Database operation failed");
}

export async function getFeaturedHomepageAnnouncementCount(): Promise<number> {
  return withDbErrorHandling(() => prisma.siteAnnouncement.count({
      where: { published: true, showOnHomepage: true },
    }), "Database operation failed");
}

export async function resolveAnnouncementFeaturedUpdate(options: {
  published: boolean;
  requestFeatured: boolean;
  currentlyFeatured: boolean;
}): Promise<{ showOnHomepage: boolean } | { error: string }> {
  if (!options.published || !options.requestFeatured) {
    return { showOnHomepage: false };
  }

  if (options.currentlyFeatured) {
    return { showOnHomepage: true };
  }

  const featuredCount = await getFeaturedHomepageAnnouncementCount();
  if (featuredCount >= HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX) {
    return {
      error: `The homepage already has ${HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX} featured announcements. Remove one before adding another.`,
    };
  }

  return { showOnHomepage: true };
}

/** Keeps at most {@link HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX} published homepage announcements (newest). */
export async function enforceHomepageAnnouncementLimit() {
  const featured = await withDbErrorHandling(() => prisma.siteAnnouncement.findMany({
      where: { published: true, showOnHomepage: true },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }), "Database operation failed");

  if (featured.length <= HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX) return;

  const demoteIds = featured
    .slice(HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX)
    .map((announcement) => announcement.id);

  await withDbErrorHandling(() => prisma.siteAnnouncement.updateMany({
      where: { id: { in: demoteIds } },
      data: { showOnHomepage: false },
    }), "Database operation failed");
}

export async function getSiteAnnouncementById(id: string) {
  return withDbErrorHandling(() => prisma.siteAnnouncement.findFirst({
      where: { id, published: true },
      include: {
        createdBy: { select: { name: true } },
        images: { select: { id: true, imagePath: true, caption: true }, orderBy: { sortOrder: 'asc' } },
      },
    }), "Database operation failed");
}

export async function getAllSiteAnnouncementsForAdminPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
) {
  const where = siteAnnouncementAdminWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.siteAnnouncement.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.siteAnnouncement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
        images: { select: { id: true, imagePath: true, caption: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
      },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getSiteAnnouncementForAdmin(id: string) {
  return withDbErrorHandling(() => prisma.siteAnnouncement.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true, email: true } },
        images: { select: { id: true, imagePath: true, caption: true, sortOrder: true }, orderBy: { sortOrder: 'asc' } },
      },
    }), "Database operation failed");
}
