"use client";

import Link from "next/link";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthNav } from "@/components/auth/AuthNav";
import { SiteLogo } from "@/components/site/SiteLogo";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/courses", label: "Courses" },
  { href: "/announcements", label: "Announcements" },
  { href: "/blog", label: "Blog" },
  { href: "/teachers", label: "Teachers" },
  { href: "/fatwa", label: "Fatwa" },
  { href: "/library", label: "Resources" },
  { href: "/bookstore", label: "Bookstore" },
  { href: "/contact", label: "Contact Us" },
];

function HeaderContent({ pathname }: { pathname: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href.includes("#")) {
      const [path, fragment] = href.split("#");
      const basePath = path || "/";
      return pathname === basePath && hash === `#${fragment}`;
    }
    if (href === "/") return pathname === "/" && !hash;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface shadow-sm">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <div className="relative z-10 shrink-0 bg-surface pr-1">
          <SiteLogo priority />
        </div>

        <nav
          className="hidden min-w-0 flex-1 items-center justify-end gap-2 overflow-hidden xl:flex"
          aria-label="Main navigation"
        >
          <div className="flex min-w-0 max-w-full flex-1 items-center justify-end overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <TrackedLink
                key={link.label}
                href={link.href}
                eventName={`Nav: ${link.label}`}
                pageName="/"
                className={`shrink-0 whitespace-nowrap px-1.5 py-2 text-[0.6875rem] font-semibold uppercase tracking-normal transition-colors 2xl:px-2.5 2xl:text-sm ${
                  active ? "text-gold" : "text-foreground hover:text-gold"
                }`}
              >
                {link.label}
              </TrackedLink>
            );
            })}
          </div>
          <div className="shrink-0 border-l border-border pl-2">
            <AuthNav />
          </div>
        </nav>

        <button
          type="button"
          className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center text-foreground hover:text-gold xl:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            {menuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-surface px-4 py-2 xl:hidden"
          aria-label="Mobile navigation"
        >
          <ul className="flex flex-col pb-2">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <li key={link.label}>
                  <TrackedLink
                    href={link.href}
                    eventName={`Nav: ${link.label}`}
                    pageName="/"
                    className={`flex min-h-11 items-center px-3 text-sm font-semibold uppercase tracking-wide ${
                      active ? "text-gold" : "text-foreground"
                    }`}
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </TrackedLink>
                </li>
              );
            })}
            <li className="mt-2 border-t border-border pt-2">
              <div className="px-3" onClick={() => setMenuOpen(false)} role="presentation">
                <AuthNav mobile />
              </div>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function Header() {
  const pathname = usePathname();
  return <HeaderContent key={pathname} pathname={pathname} />;
}
