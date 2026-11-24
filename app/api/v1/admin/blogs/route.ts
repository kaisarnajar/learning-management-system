import { NextRequest } from "next/server";
import { createBlogPost } from "@/app/admin/blogs/actions";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import { blogRow } from "@/services/api-content";
import { MAX_BLOG_IMAGES } from "@/services/blog-limits";
import { getAllBlogPostsForAdminPaginated, getFeaturedHomepageBlogCount, HOMEPAGE_FEATURED_BLOGS_MAX } from "@/services/blogs";

/** All blog posts (admins' and teachers'), as on /admin/blogs; `q` searches the title and the author. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/blogs", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const [{ items, totalCount }, featuredCount] = await Promise.all([
      getAllBlogPostsForAdminPaginated(page, pageSize, q || undefined),
      getFeaturedHomepageBlogCount(),
    ]);
    return {
      ...pagedBody(items.map(blogRow), totalCount, page, pageSize),
      featuredCount,
      featuredMax: HOMEPAGE_FEATURED_BLOGS_MAX,
      maxImages: MAX_BLOG_IMAGES,
    };
  });
}

/**
 * New post (multipart): title, excerpt, body (HTML, sanitised by the website), published ("on"),
 * featuredOnHomepage ("on"), images (files, repeated).
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/blogs POST", async () => createBlogPost(await readActionForm(request)));
}
