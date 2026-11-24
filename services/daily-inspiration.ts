import { prisma } from "@/utils/prisma";
import type { DailyInspirationKind } from "@prisma/client";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { buildSearchOr } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";

function dailyInspirationAdminWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["arabicText", "englishTranslation", "reference"], [], searchQuery);
}

export type DailyInspirationRecord = {
  id: string;
  kind: DailyInspirationKind;
  arabicText: string;
  englishTranslation: string;
  reference: string | null;
  published: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function dailyInspirationKindLabel(kind: DailyInspirationKind): string {
  return kind === "QURAN" ? "Quranic verse" : "Hadith";
}

/** The status on /admin/daily-inspiration: draft, published, or the published entry the homepage shows. */
export function dailyInspirationStatusBadge(item: { id: string; published: boolean }, homepageId: string | null) {
  if (!item.published) return { label: "Draft", className: "bg-surface-muted-hover text-muted" };
  if (item.id === homepageId) return { label: "On homepage", className: "bg-info-bg text-info-text" };
  return { label: "Published", className: "bg-success-bg text-success-text" };
}

export async function getHomepageDailyInspiration(): Promise<DailyInspirationRecord | null> {
  return withDbErrorHandling(() => prisma.dailyInspiration.findFirst({
      where: { published: true },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        kind: true,
        arabicText: true,
        englishTranslation: true,
        reference: true,
        published: true,
        createdAt: true,
        updatedAt: true,
      },
    }), "Database operation failed");
}

const dailyInspirationAdminSelect = {
  id: true,
  kind: true,
  arabicText: true,
  englishTranslation: true,
  reference: true,
  published: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getAllDailyInspirationsForAdminPaginated(
  page: number,
  pageSize: number,
  searchQuery?: string,
): Promise<PaginatedResult<DailyInspirationRecord>> {
  const where = dailyInspirationAdminWhere(searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.dailyInspiration.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.dailyInspiration.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: dailyInspirationAdminSelect,
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getDailyInspirationForAdmin(id: string) {
  return withDbErrorHandling(() => prisma.dailyInspiration.findUnique({
      where: { id },
      select: {
        id: true,
        kind: true,
        arabicText: true,
        englishTranslation: true,
        reference: true,
        published: true,
      },
    }), "Database operation failed");
}

export async function getHomepageDailyInspirationId(): Promise<string | null> {
  const current = await getHomepageDailyInspiration();
  return current?.id ?? null;
}
