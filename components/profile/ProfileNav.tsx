"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartCount } from "@/components/bookstore/CartCount";

const links = [
  { href: "/profile", label: "Profile", exact: true },
  { href: "/profile/notifications", label: "Notifications" },
  { href: "/profile/courses", label: "My Courses" },
  { href: "/profile/payments", label: "Payments" },
  { href: "/profile/cart", label: "Cart" },
  { href: "/profile/reviews", label: "My reviews" },
];

export function ProfileNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="card-elevated flex flex-wrap gap-2 p-2 sm:p-3"
      aria-label="Profile sections"
    >
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-primary text-white"
                : "border border-border text-foreground hover:bg-accent-muted/50"
            }`}
          >
            {link.label}
            {link.href === "/profile/notifications" && unreadCount > 0 && (
              <span
                className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  active ? "bg-white/20 text-white" : "bg-primary text-white"
                }`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
            {link.href === "/profile/cart" && (
              <CartCount />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
