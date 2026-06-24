import type { FatwaQuestion } from "@prisma/client";
import { resolveHomepageFeaturedUpdate } from "@/lib/homepage-featured";
import { clampPage, paginationArgs, type PaginatedResult } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { andWhere, buildSearchOr } from "@/lib/text-search";
import { withDbErrorHandling } from "@/lib/db-error";
import { getAppBaseUrl } from "@/lib/password-reset";

function fatwaSearchWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["title", "askerName", "askerEmail", "category"], [], searchQuery);
}

export const HOMEPAGE_FEATURED_FATWA_MAX = 4;

export const FATWA_CATEGORIES = [
  "Islam",
  "Quran",
  "Hadith",
  "Fiqh",
  "Tajweed",
  "Seerah",
  "Arabic Language",
  "Atheism",
  "Fatwa",
  "Other",
] as const;
export type FatwaCategory = (typeof FATWA_CATEGORIES)[number];

export function isFatwaCategory(value: string): value is FatwaCategory {
  return FATWA_CATEGORIES.includes(value as FatwaCategory);
}

export const FATWA_CATEGORY_OPTIONS = FATWA_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

export function getFatwaCategoryOptions(current?: string | null) {
  if (!current || isFatwaCategory(current)) {
    return FATWA_CATEGORY_OPTIONS;
  }
  return [{ value: current, label: current }, ...FATWA_CATEGORY_OPTIONS];
}

export function isFatwaAnswered(fatwa: Pick<FatwaQuestion, "answer">): boolean {
  return fatwa.answer != null && fatwa.answer.trim().length > 0;
}

export async function getFeaturedHomepageFatwas(): Promise<FatwaQuestion[]> {
  const fatwas = await withDbErrorHandling(() => prisma.fatwaQuestion.findMany({
      where: { featuredOnHomepage: true, answer: { not: null } },
      orderBy: [{ featuredAt: "desc" }, { answeredAt: "desc" }],
      take: HOMEPAGE_FEATURED_FATWA_MAX,
    }), "Database operation failed");
  return fatwas.filter(isFatwaAnswered);
}

export async function getFeaturedHomepageFatwaCount(): Promise<number> {
  const fatwas = await withDbErrorHandling(() => prisma.fatwaQuestion.findMany({
      where: { featuredOnHomepage: true, answer: { not: null } },
      select: { answer: true },
    }), "Database operation failed");
  return fatwas.filter(isFatwaAnswered).length;
}

export async function resolveFatwaFeaturedUpdate(options: {
  fatwa: Pick<FatwaQuestion, "answer" | "featuredOnHomepage" | "featuredAt">;
  requestFeatured: boolean;
}) {
  const featuredCount = await getFeaturedHomepageFatwaCount();
  return resolveHomepageFeaturedUpdate({
    isEligible: isFatwaAnswered(options.fatwa),
    requestFeatured: options.requestFeatured,
    currentlyFeatured: options.fatwa.featuredOnHomepage,
    currentFeaturedAt: options.fatwa.featuredAt,
    featuredCount,
    maxFeatured: HOMEPAGE_FEATURED_FATWA_MAX,
    resourceLabel: "fatwa answers",
  });
}

function answeredFatwasWhere(category?: string) {
  return {
    answer: { not: null },
    ...(category ? { category } : {}),
  };
}

export async function getAnsweredFatwasPaginated(
  page: number,
  pageSize: number,
  category?: string,
  searchQuery?: string,
): Promise<PaginatedResult<FatwaQuestion>> {
  const baseWhere = answeredFatwasWhere(category);
  const searchWhere = fatwaSearchWhere(searchQuery);
  const where = andWhere(baseWhere, searchWhere) || baseWhere;
  const totalCount = await withDbErrorHandling(() => prisma.fatwaQuestion.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.fatwaQuestion.findMany({
      where,
      orderBy: { answeredAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getAnsweredFatwaById(id: string): Promise<FatwaQuestion | null> {
  return withDbErrorHandling(() => prisma.fatwaQuestion.findFirst({
      where: { id, answer: { not: null } },
    }), "Database operation failed");
}

function fatwaAdminWhere(filter?: "pending" | "answered", searchQuery?: string) {
  const statusWhere =
    filter === "pending"
      ? { answer: null }
      : filter === "answered"
        ? { answer: { not: null } }
        : undefined;
  return andWhere(statusWhere, fatwaSearchWhere(searchQuery));
}

export async function getAllFatwaQuestionsPaginated(
  page: number,
  pageSize: number,
  filter?: "pending" | "answered",
  searchQuery?: string,
): Promise<PaginatedResult<FatwaQuestion>> {
  const where = fatwaAdminWhere(filter, searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.fatwaQuestion.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.fatwaQuestion.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getFatwaQuestionById(id: string): Promise<FatwaQuestion | null> {
  return withDbErrorHandling(() => prisma.fatwaQuestion.findUnique({ where: { id } }), "Database operation failed");
}

export function getFatwaPublicUrl(id: string): string {
  const base = getAppBaseUrl();
  return `${base.replace(/\/$/, "")}/fatwa/${id}`;
}

export function excerpt(text: string, maxLength = 160): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}…`;
}
