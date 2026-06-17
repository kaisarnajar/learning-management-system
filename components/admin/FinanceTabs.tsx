"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";




export function FinanceTabs() {
  const pathname = usePathname();
  const isBookStore = pathname === "/admin/finance/bookstore";

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4" aria-label="Finance sections">
      <Link
        href="/admin/finance"
        className={`rounded-full px-5 py-2 text-sm font-medium ${
          !isBookStore
            ? "bg-primary text-white"
            : "border border-border text-foreground hover:bg-accent-muted/50"
        }`}
      >
        Courses Finance
      </Link>
      <Link
        href="/admin/finance/bookstore"
        className={`rounded-full px-5 py-2 text-sm font-medium ${
          isBookStore
            ? "bg-primary text-white"
            : "border border-border text-foreground hover:bg-accent-muted/50"
        }`}
      >
        Book Store
      </Link>
    </nav>
  );
}
