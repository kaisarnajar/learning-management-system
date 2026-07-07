import Link from "next/link";
import { FATWA_CATEGORIES, type FatwaCategory } from "@/services/fatwa";

type FatwaCategoryFilterProps = {
  activeCategory?: string;
};

export function FatwaCategoryFilter({ activeCategory }: FatwaCategoryFilterProps) {
  const links: { label: string; value?: FatwaCategory }[] = [
    { label: "All", value: undefined },
    ...FATWA_CATEGORIES.map((c) => ({ label: c, value: c })),
  ];

  return (
    <nav
      className="flex flex-wrap justify-center gap-2"
      aria-label="Filter by category"
    >
      {links.map((link) => {
        const isActive =
          (link.value === undefined && !activeCategory) || link.value === activeCategory;
        const href = link.value ? `/fatwa?category=${encodeURIComponent(link.value)}` : "/fatwa";

        return (
          <Link
            key={link.label}
            href={href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-white shadow-sm"
                : "border border-border bg-surface text-foreground hover:bg-accent-muted/50"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
