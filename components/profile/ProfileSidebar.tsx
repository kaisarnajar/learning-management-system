"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CartCount } from "@/components/bookstore/CartCount";
import { useEffect, useRef, useState } from "react";
import {
  User,
  Bell,
  GraduationCap,
  CreditCard,
  ShoppingCart,
  Star,
  IdCard,
} from "lucide-react";

const links = [
  { href: "/profile", label: "Profile", icon: User, exact: true },
  { href: "/profile/notifications", label: "Notifications", icon: Bell },
  { href: "/profile/courses", label: "My Courses", icon: GraduationCap },
  { href: "/profile/payments", label: "Payments", icon: CreditCard },
  { href: "/profile/cart", label: "Cart", icon: ShoppingCart },
  { href: "/profile/reviews", label: "My Reviews", icon: Star },
  { href: "/profile/id-card", label: "ID Card", icon: IdCard },
];

export function ProfileSidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth - 1);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, []);

  useEffect(() => {
    if (scrollRef.current && window.innerWidth < 768) {
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
    <div className="w-full md:w-64 shrink-0">
      <div className="hidden md:block p-4 mb-2">
        <p className="font-serif text-lg font-bold text-primary">Student Panel</p>
        <p className="text-xs text-muted">Darse Quran Academy</p>
      </div>

      <div className="relative w-full md:static md:w-auto">
        {canScrollLeft && (
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-12 rounded-l-2xl bg-gradient-to-r from-surface/90 to-transparent md:hidden" />
        )}
        
        <nav
          ref={scrollRef}
          onScroll={checkScroll}
          className="flex w-full snap-x snap-mandatory items-center gap-1.5 overflow-x-auto rounded-2xl border border-border/40 bg-surface/40 p-2 shadow-sm backdrop-blur-xl md:flex-col md:items-stretch md:gap-1 md:rounded-none md:border-none md:bg-transparent md:px-3 md:py-0 md:shadow-none md:backdrop-blur-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Profile sections"
        >
          {links.map((link) => {
            const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
            const Icon = link.icon;
            
            return (
              <Link
                key={link.href}
                href={link.href}
                data-active={active}
                className={`relative flex shrink-0 snap-start items-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-300 ease-out md:justify-start md:rounded-lg md:px-3 md:py-2 md:font-medium ${
                  active
                    ? "scale-[1.02] bg-primary text-white shadow-md shadow-primary/25 md:scale-100 md:shadow-sm"
                    : "text-foreground/70 hover:scale-[1.02] hover:bg-surface-hover hover:text-foreground md:text-foreground md:hover:scale-100 md:hover:bg-accent-muted/50"
                }`}
              >
                <Icon className={`mr-2 hidden h-4 w-4 md:block ${active ? "text-white" : "text-muted group-hover:text-foreground"}`} />
                <span className="whitespace-nowrap">{link.label}</span>
                
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
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 rounded-r-2xl bg-gradient-to-l from-surface/90 to-transparent md:hidden" />
        )}
      </div>
    </div>
  );
}
