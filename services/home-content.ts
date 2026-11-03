import { getFeaturedHomepageBlogPosts } from "@/services/blogs";
import { getFeaturedHomepageBooks } from "@/services/bookstore";
import { getFeaturedHomepageCourses } from "@/services/courses";
import { getHomepageDailyInspiration } from "@/services/daily-inspiration";
import { getFeaturedHomepageFatwas } from "@/services/fatwa";
import { getFeaturedHomepageLibraryItems } from "@/services/library";
import { cachedPublic } from "@/services/public-cache";
import { getHomepageSiteAnnouncements } from "@/services/site-announcements";
import { getFeaturedHomepageReviews } from "@/services/student-reviews";

/**
 * Cached readers for the homepage sections (services/public-cache.ts).
 * They live apart from the domain services because those are also imported
 * by client components, and next/cache may only be bundled for the server.
 */
export const getCachedFeaturedHomepageCourses = cachedPublic("featured-courses", getFeaturedHomepageCourses);
export const getCachedHomepageDailyInspiration = cachedPublic("daily-inspiration", getHomepageDailyInspiration);
export const getCachedHomepageSiteAnnouncements = cachedPublic("homepage-announcements", getHomepageSiteAnnouncements);
export const getCachedFeaturedHomepageBlogPosts = cachedPublic("featured-blogs", getFeaturedHomepageBlogPosts);
export const getCachedFeaturedHomepageLibraryItems = cachedPublic("featured-library", getFeaturedHomepageLibraryItems);
export const getCachedFeaturedHomepageBooks = cachedPublic("featured-books", getFeaturedHomepageBooks);
export const getCachedFeaturedHomepageFatwas = cachedPublic("featured-fatwas", getFeaturedHomepageFatwas);
export const getCachedFeaturedHomepageReviews = cachedPublic("featured-reviews", getFeaturedHomepageReviews);
