"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BRAND_CONFIG } from "@/config/brand";

const links = [
  { href: "/teacher", label: "My courses", exact: true },
  { href: "/teacher/blogs", label: "My blogs" },
  { href: "/teacher/fatwa", label: "Fatwa Q&A" },
];

export function TeacherSidebar({ teacherName }: { teacherName: string }) {
  const pathname = usePathname();

  return (
    <aside className="border-b border-border bg-surface md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="p-4">
        <p className="font-serif text-lg font-bold text-primary">Teacher portal</p>
        <p className="mt-1 text-sm font-medium text-foreground">{teacherName}</p>
        <p className="text-xs text-muted">{BRAND_CONFIG.name}</p>
      </div>
      <nav className="flex flex-col gap-0.5 px-2 pb-4 md:px-3" aria-label="Teacher navigation">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "text-foreground hover:bg-accent-muted/50"
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
