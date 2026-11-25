import type { FatwaQuestion } from "@prisma/client";
import { resolveHomepageFeaturedUpdate } from "@/services/homepage-featured";
import { clampPage, paginationArgs, type PaginatedResult } from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { andWhere, buildSearchOr } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";
import { getAppBaseUrl } from "@/services/password-reset";
import { cache } from "react";
import { BASE_CATEGORIES, FATWA_CATEGORIES, FATWA_CATEGORY_OPTIONS, getFatwaCategoryOptions, isFatwaCategory, type FatwaCategory } from "@/config/fatwa-categories";
import { HOMEPAGE_FEATURED_FATWA_MAX } from "@/config/constants/business";
import { BRAND_CONFIG } from "@/config/brand";
import { fatwaQuestionSchema } from "@/utils/validations";

// Pure helpers, importable from client components: config/fatwa-categories.ts
export { BASE_CATEGORIES, FATWA_CATEGORIES, FATWA_CATEGORY_OPTIONS, getFatwaCategoryOptions, isFatwaCategory };
export type { FatwaCategory };

/**
 * Name and e-mail of the account that answered a fatwa, for the courtesy
 * e-mail sent after a review. A failed lookup is logged and answers null, so
 * the review itself (already saved) is never affected.
 */
export async function findFatwaAnswererContact(userId: string): Promise<{ email: string; name: string | null } | null> {
  return prisma.user
    .findUnique({ where: { id: userId }, select: { email: true, name: true } })
    .catch((error: unknown) => {
      console.error(`[fatwa] Could not look up answering user ${userId}:`, error);
      return null;
    });
}

/**
 * A teacher cannot change an answer while it awaits review or once it is
 * published: saving would resubmit it and take it off the public site.
 */
export function isFatwaAnswerLocked(question: Pick<FatwaQuestion, "approvalStatus" | "answer">): boolean {
  return question.approvalStatus === "PENDING" || (question.approvalStatus === "APPROVED" && Boolean(question.answer));
}

/** The database form of the opposite of `isFatwaAnswerLocked`, for a guarded update. */
export const FATWA_ANSWER_EDITABLE_WHERE = {
  NOT: { OR: [{ approvalStatus: "PENDING" as const }, { approvalStatus: "APPROVED" as const, answer: { not: null } }] },
};

/** Admin-only search: may match asker name and e-mail. */
function fatwaAdminSearchWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["title", "askerName", "askerEmail", "category"], [], searchQuery);
}

/**
 * Public/teacher search: content fields only. Matching on askerEmail here
 * would let anyone test whether an address has asked a question.
 */
function fatwaPublicSearchWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["title", "question", "category"], [], searchQuery);
}

export { HOMEPAGE_FEATURED_FATWA_MAX };

type FatwaStatusFields = { answer: string | null; approvalStatus: string };

/** The status badge on the admin and teacher Fatwa Q&A lists. */
export function fatwaStatusLabel(q: FatwaStatusFields): string {
  if (q.approvalStatus === "PENDING") return "Pending Review";
  if (q.approvalStatus === "REJECTED") return "Rejected";
  if (q.approvalStatus === "APPROVED" && q.answer) return "Answered";
  return "Unanswered";
}

export function fatwaStatusClass(q: FatwaStatusFields): string {
  if (q.approvalStatus === "PENDING") return "bg-warning-bg text-warning-text";
  if (q.approvalStatus === "REJECTED") return "bg-destructive-bg text-destructive-text";
  if (q.approvalStatus === "APPROVED" && q.answer) return "bg-success-bg text-success-text";
  return "bg-surface-alt text-muted";
}

export function isFatwaAnswered(fatwa: Pick<FatwaQuestion, "answer" | "approvalStatus">): boolean {
  return fatwa.approvalStatus === "APPROVED" && fatwa.answer != null && fatwa.answer.trim().length > 0;
}

export async function getFeaturedHomepageFatwas(): Promise<FatwaQuestion[]> {
  const fatwas = await withDbErrorHandling(() => prisma.fatwaQuestion.findMany({
      where: { featuredOnHomepage: true, answer: { not: null }, approvalStatus: "APPROVED" },
      orderBy: [{ featuredAt: "desc" }, { answeredAt: "desc" }],
      take: HOMEPAGE_FEATURED_FATWA_MAX,
    }), "Database operation failed");
  return fatwas.filter(isFatwaAnswered);
}

export async function getFeaturedHomepageFatwaCount(): Promise<number> {
  const fatwas = await withDbErrorHandling(() => prisma.fatwaQuestion.findMany({
      where: { featuredOnHomepage: true, answer: { not: null }, approvalStatus: "APPROVED" },
      select: { answer: true, approvalStatus: true },
    }), "Database operation failed");
  return fatwas.filter(isFatwaAnswered).length;
}

export async function resolveFatwaFeaturedUpdate(options: {
  fatwa: Pick<FatwaQuestion, "answer" | "approvalStatus" | "featuredOnHomepage" | "featuredAt">;
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
  const isOthers = category === "Others";
  
  return {
    answer: { not: null },
    approvalStatus: "APPROVED" as const,
    ...(isOthers
      ? { category: { notIn: [...BASE_CATEGORIES] } }
      : category
        ? { category }
        : {}),
  };
}

export async function getAnsweredFatwasPaginated(
  page: number,
  pageSize: number,
  category?: string,
  searchQuery?: string,
): Promise<PaginatedResult<FatwaQuestion>> {
  const baseWhere = answeredFatwasWhere(category);
  const searchWhere = fatwaPublicSearchWhere(searchQuery);
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

/** Memoised per request: generateMetadata and the page share one query. */
export const getAnsweredFatwaById = cache(async (id: string): Promise<FatwaQuestion | null> => {
  return withDbErrorHandling(() => prisma.fatwaQuestion.findFirst({
      where: { id, answer: { not: null }, approvalStatus: "APPROVED" },
    }), "Database operation failed");
});

export type FatwaAdminFilter = "pending" | "answered" | "unanswered" | "rejected";

function fatwaAdminWhere(filter?: FatwaAdminFilter, searchQuery?: string, audience: "admin" | "teacher" = "admin") {
  const statusWhere =
    filter === "unanswered"
      ? { answer: null }
      : filter === "pending"
        ? { answer: { not: null }, approvalStatus: "PENDING" as const }
        : filter === "rejected"
          ? { answer: { not: null }, approvalStatus: "REJECTED" as const }
          : filter === "answered"
            ? { answer: { not: null }, approvalStatus: "APPROVED" as const }
            : undefined;
  return andWhere(
    statusWhere,
    audience === "admin" ? fatwaAdminSearchWhere(searchQuery) : fatwaPublicSearchWhere(searchQuery),
  );
}

export async function getAllFatwaQuestionsPaginated(
  page: number,
  pageSize: number,
  filter?: FatwaAdminFilter,
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

export async function getTeacherFatwaQuestionsPaginated(
  userId: string,
  page: number,
  pageSize: number,
  filter?: FatwaAdminFilter,
  searchQuery?: string,
): Promise<PaginatedResult<FatwaQuestion>> {
  const baseWhere = fatwaAdminWhere(filter, searchQuery, "teacher");
  
  // Teachers can only see unanswered questions, or questions they themselves answered.
  const teacherWhere = {
    OR: [
      { answer: null },
      { answeredById: userId }
    ]
  };
  
  const where = andWhere(baseWhere, teacherWhere);
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

const ANONYMOUS_ASKER_NAME = "Anonymous";

function anonymousAskerEmail(): string {
  return `anonymous@${new URL(BRAND_CONFIG.websiteUrl).hostname}`;
}

export type FatwaAsker = { id: string; name: string | null; email: string };

/**
 * Stores a question asked on the website or in the app. Both callers go
 * through here so the two cannot drift apart: a question starts in the
 * default (APPROVED, unanswered) state, which is the one teachers can answer;
 * a signed-in asker is linked to their account and named by it, unless they
 * ask anonymously.
 */
export async function createFatwaQuestion(
  input: { category: unknown; title: unknown; question: unknown; askerName: unknown; askerEmail: unknown },
  options: { asker: FatwaAsker | null; isAnonymous: boolean },
): Promise<{ ok: true; question: FatwaQuestion } | { ok: false; error: string }> {
  const { asker, isAnonymous } = options;
  const parsed = fatwaQuestionSchema.safeParse({
    ...input,
    askerName: isAnonymous ? ANONYMOUS_ASKER_NAME : (asker?.name?.trim() || input.askerName),
    askerEmail: isAnonymous ? anonymousAskerEmail() : (asker?.email.toLowerCase().trim() || input.askerEmail),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid fatwa question." };

  const question = await prisma.fatwaQuestion.create({
    data: { ...parsed.data, userId: isAnonymous ? null : (asker?.id ?? null) },
  });
  return { ok: true, question };
}
