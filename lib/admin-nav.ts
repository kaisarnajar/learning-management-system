export type AdminNavLink = {
  href: string;
  label: string;
  exact?: boolean;
};

export type AdminNavGroup = {
  title: string;
  links: AdminNavLink[];
};

/** Sidebar links that open settings/tools pages (no dashboard count). */
export const ADMIN_DASHBOARD_LINK_HREFS = new Set<string>([
  "/admin/payment-settings",
  "/admin/finance",
  "/admin/record-payment",
  "/admin/record-expense",
  "/admin/social-links",
]);

/** Admin sidebar groups for collapsible navigation. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: "User Management",
    links: [
      { href: "/admin/students", label: "Students" },
      { href: "/admin/teachers", label: "Teachers" },
    ],
  },
  {
    title: "Academic Management",
    links: [
      { href: "/admin/courses", label: "Courses" },
      { href: "/admin/enrollments", label: "Enrollments" },
      { href: "/admin/certificates", label: "Certificates" },
      { href: "/admin/announcements", label: "Announcements" },
      { href: "/admin/review-approvals", label: "Review approvals" },
    ],
  },
  {
    title: "Content Management",
    links: [
      { href: "/admin/blogs", label: "Blogs" },
      { href: "/admin/blog-approvals", label: "Blog approvals" },
      { href: "/admin/fatwa", label: "Fatwa" },
      { href: "/admin/library", label: "Digital Library" },
      { href: "/admin/daily-inspiration", label: "Verse & Hadith" },
      { href: "/admin/bookstore", label: "Bookstore" },
      { href: "/admin/bookstore/orders", label: "Book Orders" },
    ],
  },
  {
    title: "Payments & Finance",
    links: [
      { href: "/admin/payments", label: "Payments" },
      { href: "/admin/receipts", label: "Payment Receipts" },
      { href: "/admin/finance", label: "Finance" },
      { href: "/admin/record-payment", label: "Record payment" },
      { href: "/admin/record-expense", label: "Record expense" },
      { href: "/admin/payment-settings", label: "Payment details" },
      { href: "/admin/shipping-charges", label: "Shipping charges" },
    ],
  },
  {
    title: "System Settings",
    links: [
      { href: "/admin/contact-inquiries", label: "Contact inquiries" },
      { href: "/admin/social-links", label: "Social links" },
      { href: "/admin/academy-settings", label: "Academy settings" },
    ],
  },
];

/** Flat list of all admin navigation links (used for dashboard cards and backwards compatibility). */
export const ADMIN_NAV_LINKS: AdminNavLink[] = ADMIN_NAV_GROUPS.flatMap(
  (group) => group.links,
);
