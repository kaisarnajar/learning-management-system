import { NextRequest } from "next/server";
import {
  getCachedFeaturedHomepageBlogPosts,
  getCachedFeaturedHomepageBooks,
  getCachedFeaturedHomepageCourses,
  getCachedFeaturedHomepageFatwas,
  getCachedFeaturedHomepageLibraryItems,
  getCachedFeaturedHomepageReviews,
  getCachedHomepageDailyInspiration,
  getCachedHomepageSiteAnnouncements,
} from "@/services/home-content";
import { toPublicBookDto, toPublicCourseDto, toPublicFatwaDto } from "@/services/api-dto";
import { sanitizeRichText } from "@/services/rich-text";
import { apiServerError, publicJson } from "@/utils/api-response";

/**
 * Everything the app's home screen shows, in one request: the same featured
 * sections as the website's homepage (cached for five minutes, refreshed
 * when an admin publishes or features content).
 */
export async function GET(request: NextRequest) {
  try {
    const [courses, inspiration, announcements, blogPosts, libraryItems, books, fatwas, reviews] = await Promise.all([
      getCachedFeaturedHomepageCourses(),
      getCachedHomepageDailyInspiration(),
      getCachedHomepageSiteAnnouncements(),
      getCachedFeaturedHomepageBlogPosts(),
      getCachedFeaturedHomepageLibraryItems(),
      getCachedFeaturedHomepageBooks(),
      getCachedFeaturedHomepageFatwas(),
      getCachedFeaturedHomepageReviews(),
    ]);

    return publicJson(request, {
      success: true,
      dailyInspiration: inspiration,
      announcements,
      courses: courses.map(toPublicCourseDto),
      blogPosts: blogPosts.map((post) => ({ ...post, body: sanitizeRichText(post.body) })),
      libraryItems,
      books: books.map(toPublicBookDto),
      fatwas: fatwas.map(toPublicFatwaDto),
      reviews,
    });
  } catch (error) {
    return apiServerError("api/v1/home", error, "Failed to load the home screen.");
  }
}
