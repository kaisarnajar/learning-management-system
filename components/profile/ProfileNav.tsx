"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartCount } from "@/components/bookstore/CartCount";
import { useEffect, useRef, useState } from "react";

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      // Use a 1px threshold to account for subpixel rounding issues
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      const activeTab = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement;
      if (activeTab) {
        const container = scrollRef.current;
        const containerWidth = container.clientWidth;
        const containerLeft = container.getBoundingClientRect().left;
        const tabLeft = activeTab.getBoundingClientRect().left;
        const tabWidth = activeTab.clientWidth;
        
        const scrollDiff = tabLeft - containerLeft;
        const centerOffset = (containerWidth / 2) - (tabWidth / 2);
        const scrollTarget = container.scrollLeft + scrollDiff - centerOffset;
        
        container.scrollTo({
          left: scrollTarget,
          behavior: "smooth"
        });
      }
    }
  }, [pathname]);

  return (
    <div className="relative w-full">
      {canScrollLeft && (
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-12 rounded-l-2xl bg-gradient-to-r from-surface/90 to-transparent sm:hidden" />
      )}
      
      <nav
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex w-full snap-x snap-mandatory items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/40 bg-surface/40 p-2 shadow-sm backdrop-blur-xl sm:gap-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Profile sections"
      >
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              data-active={active}
              className={`relative flex shrink-0 snap-start items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-out ${
                active
                  ? "scale-[1.02] bg-primary text-white shadow-md shadow-primary/25"
                  : "text-foreground/70 hover:scale-[1.02] hover:bg-surface-hover hover:text-foreground"
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

      {canScrollRight && (
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 rounded-r-2xl bg-gradient-to-l from-surface/90 to-transparent sm:hidden" />
      )}
    </div>
  );
}
