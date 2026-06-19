export type AdminNavLink = {
  href: string;
  label: string;
  exact?: boolean;
};

/** Sidebar links that open settings/tools pages (no dashboard count). */
export const ADMIN_DASHBOARD_LINK_HREFS = new Set<string>([
  "/admin/payment-settings",
  "/admin/finance",
  "/admin/record-expense",
  "/admin/social-links",
]);

/** Admin sidebar links (excluding Dashboard). */
export const ADMIN_NAV_LINKS: AdminNavLink[] = [
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/announcements", label: "Announcements" },
  { href: "/admin/blogs", label: "Blogs" },
  { href: "/admin/daily-inspiration", label: "Verse & Hadith" },
  { href: "/admin/courses", label: "Courses" },
  { href: "/admin/enrollments", label: "Enrollments" },
  { href: "/admin/payment-settings", label: "Payment details" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/record-expense", label: "Record expense" },
  { href: "/admin/social-links", label: "Social links" },
  { href: "/admin/students", label: "Students" },
  { href: "/admin/teachers", label: "Teachers" },
  { href: "/admin/library", label: "Digital Library" },
  { href: "/admin/bookstore", label: "Bookstore" },
  { href: "/admin/bookstore/orders", label: "Book Orders" },
  { href: "/admin/fatwa", label: "Fatwa" },
  { href: "/admin/contact-inquiries", label: "Contact inquiries" },
  { href: "/admin/blog-approvals", label: "Blog approvals" },
  { href: "/admin/review-approvals", label: "Review approvals" },
  { href: "/admin/payment-approvals", label: "Payment approvals" },
];
