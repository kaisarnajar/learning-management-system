import Link from "next/link";
import { LIBRARY_TOPICS, type LibraryTopic } from "@/services/library-options";

type LibraryCategoryFilterProps = {
  activeCategory?: string;
};

export function LibraryCategoryFilter({ activeCategory }: LibraryCategoryFilterProps) {
  const links: { label: string; value?: LibraryTopic }[] = [
    { label: "All", value: undefined },
    ...LIBRARY_TOPICS.map((category) => ({ label: category, value: category })),
  ];

  return (
    <nav className="flex flex-wrap justify-center gap-2" aria-label="Filter by topic">
      {links.map((link) => {
        const isActive =
          (link.value === undefined && !activeCategory) || link.value === activeCategory;
        const href = link.value ? `/library?category=${encodeURIComponent(link.value)}` : "/library";

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
