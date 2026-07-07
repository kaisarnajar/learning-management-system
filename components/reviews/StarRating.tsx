import { REVIEW_RATING_MAX } from "@/services/review-rating";

type StarRatingProps = {
  rating: number;
  size?: "sm" | "md";
  className?: string;
};

const sizeClass = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
} as const;

export function StarRating({ rating, size = "md", className = "" }: StarRatingProps) {
  const safeRating = Math.min(REVIEW_RATING_MAX, Math.max(0, Math.round(rating)));

  return (
    <div
      className={`flex gap-0.5 text-gold ${className}`}
      aria-label={`${safeRating} out of ${REVIEW_RATING_MAX} stars`}
      role="img"
    >
      {Array.from({ length: REVIEW_RATING_MAX }).map((_, index) => {
        const filled = index < safeRating;
        return (
          <svg
            key={index}
            className={`${sizeClass[size]} ${filled ? "fill-current" : "fill-none stroke-current"}`}
            viewBox="0 0 20 20"
            aria-hidden
          >
            <path
              strokeWidth={filled ? 0 : 1.2}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        );
      })}
    </div>
  );
}
