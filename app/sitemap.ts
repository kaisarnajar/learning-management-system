import { MetadataRoute } from "next";
import { prisma } from "@/utils/prisma";
import { BRAND_CONFIG } from "@/config/brand";

export const dynamic = "force-dynamic";

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
    // Dynamic published courses
    const courses = await prisma.course.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
    });

    const courseRoutes: MetadataRoute.Sitemap = courses.map((course) => ({
      url: `${baseUrl}/courses/${course.id}`,
      lastModified: course.updatedAt || new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    }));

    // Dynamic published blog posts
    const blogPosts = await prisma.blogPost.findMany({
      where: { published: true, approvalStatus: "APPROVED" },
      select: { id: true, updatedAt: true },
    });

    const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
      url: `${baseUrl}/blog/${post.id}`,
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
    return staticRoutes;
  }
}
