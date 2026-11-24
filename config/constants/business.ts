/**
 * The academy's timezone. Finance date filters, "paid on" dates and
 * calendar presets are interpreted in this zone, never in the server's.
 */
export const BUSINESS_TIMEZONE = "Asia/Kolkata";

/**
 * Legacy text values of Enrollment.status. The typed twin is the
 * EnrollmentStatus enum (Enrollment.statusEnum); services/status-compat.ts
 * maps between the two while both columns exist.
 */
export const ENROLLMENT_STATUS = {
  PENDING: "pending_approval",
  AWAITING_FEE: "awaiting_enrollment_fee",
  ACTIVE: "active",
  COMPLETED: "completed",
  REJECTED: "rejected",
} as const;

/**
 * Standard Pagination Settings
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 15,
  MAX_PAGE_SIZE: 50,
} as const;

/**
 * Maximum quantity of a single book in one order or cart line.
 */
export const MAX_ORDER_QTY = 20;

/**
 * Number of student reviews the homepage shows at a time.
 */
export const HOMEPAGE_FEATURED_REVIEWS_MAX = 4;

/** How many items of each kind the homepage features at most (the admin forms cap the checkbox). */
export const HOMEPAGE_FEATURED_BLOGS_MAX = 4;
export const HOMEPAGE_FEATURED_COURSES_MAX = 6;
export const HOMEPAGE_FEATURED_FATWA_MAX = 4;
export const HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX = 4;
export const HOMEPAGE_FEATURED_BOOKS_MAX = 4;
export const HOMEPAGE_FEATURED_RESOURCES_MAX = 4;

