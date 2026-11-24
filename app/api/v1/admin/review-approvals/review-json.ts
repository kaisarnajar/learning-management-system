import { BRAND_CONFIG } from "@/config/brand";
import { reviewStatusLabel, type StudentReviewWithUser } from "@/services/student-reviews";

/** A student review as the admin review screens show it. */
export function reviewJson(review: StudentReviewWithUser) {
  return {
    id: review.id,
    quote: review.quote,
    course: review.course,
    courseLabel: review.course?.trim() || BRAND_CONFIG.name,
    location: review.location,
    rating: review.rating,
    status: review.status,
    statusLabel: reviewStatusLabel(review.status),
    featuredOnHomepage: review.featuredOnHomepage,
    featuredAt: review.featuredAt,
    createdAt: review.createdAt,
    user: { id: review.user.id, name: review.user.name, email: review.user.email },
  };
}
