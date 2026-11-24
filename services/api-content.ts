import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import type { BlogPost, FatwaQuestion, LibraryItem } from "@prisma/client";
import { BRAND_CONFIG } from "@/config/brand";
import { HOMEPAGE_FEATURED_RESOURCES_MAX } from "@/services/library";
import { LIBRARY_LANGUAGES, LIBRARY_TOPICS } from "@/services/library-options";
import { levelEnum } from "@/utils/validations";
import { blogApprovalStatusLabel } from "@/services/blog-approval";
import { isBlogPubliclyVisible } from "@/services/blogs";
import { fatwaStatusLabel } from "@/services/fatwa";

/**
 * Some content actions report a failure by redirecting with a short code
 * (`?error=notfound`, `?error=locked`) that their page turns into a sentence.
 * For the app, [run] the action and answer those codes with the page's sentence;
 * every other outcome (success or a readable error) is left to `staffAction`.
 */
export async function withErrorCodes<T>(
  run: () => Promise<T>,
  codes: Record<string, { message: string; status?: number }>,
): Promise<T | NextResponse> {
  try {
    return await run();
  } catch (error) {
    if (isRedirectError(error)) {
      const code = new URL(getURLFromRedirectError(error), "http://local").searchParams.get("error");
      const known = code ? codes[code] : undefined;
      if (known) return NextResponse.json({ success: false, error: known.message }, { status: known.status ?? 400 });
    }
    throw error;
  }
}

export const NOT_FOUND_CODE = (noun: string) => ({ notfound: { message: `${noun} not found.`, status: 404 } });

/** Images attached to a post or announcement, as the app reads them. */
export function imageRows(images: { id: string; imagePath: string; caption: string | null; sortOrder?: number }[]) {
  return images.map((img) => ({ id: img.id, imagePath: img.imagePath, caption: img.caption, sortOrder: img.sortOrder ?? null }));
}

type BlogForApp = BlogPost & {
  images: { id: string; imagePath: string; caption: string | null; sortOrder: number }[];
  createdBy?: { name: string | null; email?: string | null } | null;
};

/** A blog post in a list (admin blogs, blog approvals, the teacher's posts). */
export function blogRow(post: BlogForApp) {
  const visible = isBlogPubliclyVisible(post);
  return {
    id: post.id,
    title: post.title,
    excerpt: post.excerpt,
    approvalStatus: post.approvalStatus,
    published: post.published,
    statusLabel: blogApprovalStatusLabel(post.approvalStatus, post.published),
    featuredOnHomepage: post.featuredOnHomepage && visible,
    imageCount: post.images.length,
    thumbnail: post.images[0]?.imagePath ?? null,
    authorName: post.createdBy?.name ?? null,
    authorEmail: post.createdBy?.email ?? null,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    publicPath: visible ? `/blog/${post.id}` : null,
  };
}

/**
 * A fatwa question in a list. [withAsker]: the asker's name and e-mail (admins only — the teacher portal never
 * shows who asked); an anonymous asker's placeholder address is reported as null ("N/A" on the website).
 */
export function fatwaRow(q: FatwaQuestion, { withAsker }: { withAsker: boolean }) {
  const anonymousEmail = `anonymous@${new URL(BRAND_CONFIG.websiteUrl).hostname}`;
  return {
    id: q.id,
    title: q.title,
    category: q.category,
    approvalStatus: q.approvalStatus,
    answered: Boolean(q.answer),
    statusLabel: fatwaStatusLabel(q),
    featuredOnHomepage: q.featuredOnHomepage && Boolean(q.answer),
    createdAt: q.createdAt,
    answeredAt: q.answeredAt,
    publicPath: q.approvalStatus === "APPROVED" && q.answer ? `/fatwa/${q.id}` : null,
    ...(withAsker
      ? {
          askerName: q.askerName,
          askerEmail: q.askerEmail === anonymousEmail ? null : q.askerEmail,
          anonymous: q.askerEmail === anonymousEmail || q.askerName === "Anonymous",
        }
      : {}),
  };
}

/** A fatwa question with its text and answer (stored, sanitised HTML). */
export function fatwaDetail(q: FatwaQuestion, { withAsker }: { withAsker: boolean }) {
  return { ...fatwaRow(q, { withAsker }), question: q.question, answer: q.answer };
}

/** A digital library item; "Published" / "Not published" and "Featured" as the admin pages word them. */
export function libraryItemBody(item: LibraryItem) {
  return {
    id: item.id,
    title: item.title,
    author: item.author,
    topic: item.topic,
    level: item.level,
    language: item.language,
    pdfUrl: item.pdfUrl,
    imagePath: item.imagePath,
    published: item.published,
    statusLabel: item.published ? "Published" : "Not published",
    featuredOnHomepage: item.featuredOnHomepage && item.published,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

/** The choices and limits of the library form (LibraryForm.tsx). "Other" lets the admin type a topic or language. */
export function libraryFormOptions(featuredCount: number) {
  return {
    topics: [...LIBRARY_TOPICS],
    languages: [...LIBRARY_LANGUAGES],
    levels: [...levelEnum.options],
    featuredCount,
    featuredMax: HOMEPAGE_FEATURED_RESOURCES_MAX,
  };
}

/** A blog post with everything its edit form shows. [body] is the stored (already sanitised) HTML. */
export function blogDetail(post: BlogForApp) {
  return { ...blogRow(post), body: post.body, images: imageRows(post.images) };
}
