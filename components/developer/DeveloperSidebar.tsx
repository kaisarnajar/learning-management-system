"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ADMIN_NAV_GROUPS, ADMIN_NAV_LINKS } from "@/lib/admin-nav";

const DEVELOPER_NAV_GROUPS = [
  {
    title: "Analytics & Tools",
    links: [{ href: "/developer/analytics", label: "Analytics" }],
  },
  ...ADMIN_NAV_GROUPS,
];

const allLinks = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/developer/analytics", label: "Analytics", exact: false },
  ...ADMIN_NAV_LINKS.map((link) => ({ ...link, exact: false })),
];

export function DeveloperSidebar() {
  const pathname = usePathname();

  const activePath = allLinks
    .filter((l) => pathname === l.href || pathname.startsWith(`${l.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initialExpanded: Record<string, boolean> = {};
    for (const group of DEVELOPER_NAV_GROUPS) {
      if (group.links.some((link) => link.href === activePath)) {
        initialExpanded[group.title] = true;
      } else {
        initialExpanded[group.title] = false;
      }
    }
    return initialExpanded;
  });

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <aside className="border-b border-border bg-surface md:w-56 md:border-b-0 md:border-r overflow-y-auto">
      <div className="p-4">
        <p className="font-serif text-lg font-bold text-primary">Developer Panel</p>
        <p className="text-xs text-muted">Darse Quran Academy</p>
      </div>
      <nav className="flex flex-col gap-1 px-2 pb-6 md:px-3" aria-label="Developer navigation">
        <Link
          href="/admin"
          className={`rounded-lg px-3 py-2 text-sm font-medium mb-1 ${
            pathname === "/admin"
              ? "bg-primary text-white shadow-sm"
              : "text-foreground hover:bg-accent-muted/50"
          }`}
        >
          Dashboard
        </Link>

        {DEVELOPER_NAV_GROUPS.map((group) => {
          const isExpanded = expandedGroups[group.title];
          return (
            <div key={group.title} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className="group flex w-full items-center justify-between rounded-lg px-3 py-2 mt-2 text-left text-xs font-semibold text-muted hover:text-foreground transition-colors"
              >
                <span className="uppercase tracking-wider">{group.title}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`h-3 w-3 text-muted/70 transition-transform group-hover:text-foreground ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {isExpanded && (
                <div className="flex flex-col gap-0.5">
                  {group.links.map((link) => {
                    const active = link.href === activePath;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`rounded-lg px-3 pl-4 py-2 text-sm font-medium transition-colors ${
                          active
                            ? "bg-primary text-white shadow-sm"
                            : "text-muted-foreground hover:bg-accent-muted/50 hover:text-foreground"
                        }`}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
