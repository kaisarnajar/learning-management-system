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
    <div className="relative w-full">
      <nav
        className="flex w-full snap-x snap-mandatory items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/40 bg-surface/40 p-2 backdrop-blur-xl shadow-sm sm:gap-2"
        style={{ scrollbarWidth: "none" }} // Hide scrollbar
        aria-label="Profile sections"
      >
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`relative flex shrink-0 snap-start items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-out ${
                active
                  ? "bg-primary text-white shadow-md shadow-primary/25 scale-[1.02]"
                  : "text-foreground/70 hover:bg-surface-hover hover:text-foreground hover:scale-[1.02]"
              }`}
            >
              {link.label}
              
              {link.href === "/profile/notifications" && unreadCount > 0 && (
                <span
                  className={`ml-2 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tracking-wide transition-colors ${
                    active ? "bg-white/25 text-white" : "bg-primary text-white"
                  }`}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
              
              {link.href === "/profile/cart" && (
                <div className="ml-2">
                  <CartCount />
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
