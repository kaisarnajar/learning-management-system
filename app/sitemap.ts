import { MetadataRoute } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { prisma } from "@/utils/prisma";
import { BRAND_CONFIG } from "@/config/brand";
import { isCoursePubliclyVisible } from "@/services/course-status";
import { getBlogPostPath } from "@/utils/blog-path";

// Regenerated at most once an hour; content actions do not need to invalidate it.
// A database error fails the regeneration (Next keeps serving the previous
// sitemap) instead of caching a static-only one for the next hour. Only the
// build itself, which may run without a migrated database (CI), falls back to
// the static routes; the first revalidation then adds the rest.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = BRAND_CONFIG.websiteUrl.replace(/\/$/, "");

  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/courses",
    "/about",
    "/blog",
    "/bookstore",
    "/fatwa",
    "/library",
    "/teachers",
    "/contact",
    "/privacy-policy",
    "/terms-and-conditions",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1.0 : 0.8,
  }));

  try {
    // Every course listed on the public site (published, ongoing, coming soon).
    const courses = (
      await prisma.course.findMany({
        select: { id: true, status: true, updatedAt: true },
      })
    ).filter((course) => isCoursePubliclyVisible(course.status));

    const courseRoutes: MetadataRoute.Sitemap = courses.map((course) => ({
      url: `${baseUrl}/courses/${course.id}`,
      lastModified: course.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    // Dynamic published blog posts
    const blogPosts = await prisma.blogPost.findMany({
      where: { published: true, approvalStatus: "APPROVED" },
      select: { id: true, slug: true, updatedAt: true },
    });

    const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
      url: `${baseUrl}${getBlogPostPath(post)}`,
      lastModified: post.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    // Dynamic published books
    const books = await prisma.book.findMany({
      where: { published: true },
      select: { id: true, updatedAt: true },
    });

    const bookRoutes: MetadataRoute.Sitemap = books.map((book) => ({
      url: `${baseUrl}/bookstore/${book.id}`,
      lastModified: book.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    }));

    // Dynamic answered fatwas
    const fatwas = await prisma.fatwaQuestion.findMany({
      where: { approvalStatus: "APPROVED", answer: { not: null } },
      select: { id: true, updatedAt: true },
    });

    const fatwaRoutes: MetadataRoute.Sitemap = fatwas.map((fatwa) => ({
      url: `${baseUrl}/fatwa/${fatwa.id}`,
      lastModified: fatwa.updatedAt || new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    // Dynamic published library items
    const libraryItems = await prisma.libraryItem.findMany({
      where: { published: true },
      select: { id: true, updatedAt: true },
    });

    const libraryRoutes: MetadataRoute.Sitemap = libraryItems.map((item) => ({
      url: `${baseUrl}/library/${item.id}`,
      lastModified: item.updatedAt || new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [
      ...staticRoutes,
      ...courseRoutes,
      ...blogRoutes,
      ...bookRoutes,
      ...fatwaRoutes,
      ...libraryRoutes,
    ];
  } catch (error) {
    console.error("Error generating sitemap:", error);
    if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return staticRoutes;
    throw error;
  }
}
