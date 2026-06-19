"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV_LINKS } from "@/lib/admin-nav";

type DeveloperSidebarLink = {
  href: string;
  label: string;
  exact?: boolean;
};

const links: DeveloperSidebarLink[] = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/developer/analytics", label: "Analytics", exact: false },
  ...ADMIN_NAV_LINKS.map((link) => ({ ...link, exact: false })),
];

export function DeveloperSidebar() {
  const pathname = usePathname();

  const activePath = links
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside className="border-b border-border bg-surface md:w-56 md:border-b-0 md:border-r">
      <div className="p-4">
        <p className="font-serif text-lg font-bold text-primary">Developer Panel</p>
        <p className="text-xs text-muted">Darse Quran Academy</p>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 pb-4 md:px-3" aria-label="Developer navigation">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : link.href === activePath;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                active ? "bg-primary text-white shadow-sm" : "text-foreground hover:bg-accent-muted/50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
