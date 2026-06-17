"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { buildFinanceQueryString, FINANCE_TABS, type FinanceFilters } from "@/lib/finance-filters";

type FinanceTabsProps = {
  filters?: FinanceFilters;
};

export function FinanceTabs({ filters }: FinanceTabsProps) {
  const pathname = usePathname();
  const isBookStore = pathname === "/admin/finance/bookstore";

  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-4" aria-label="Finance sections">
      {FINANCE_TABS.map((item) => {
        const active = !isBookStore && filters?.tab === item.tab;
        const href = filters 
          ? `/admin/finance${buildFinanceQueryString({ ...filters, tab: item.tab })}` 
          : `/admin/finance?tab=${item.tab}`;

        return (
          <Link
            key={item.tab}
            href={href}
            className={`rounded-full px-5 py-2 text-sm font-medium ${
              active
                ? "bg-primary text-white"
                : "border border-border text-foreground hover:bg-accent-muted/50"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      
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
