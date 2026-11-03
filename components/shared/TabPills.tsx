import type { ReactNode } from "react";
import Link from "next/link";

export type TabPillItem = {
  key?: string;
  href: string;
  label: ReactNode;
  active: boolean;
};

/** Row of rounded filter/section links with one highlighted. Usable from server and client components. */
export function TabPills({
  items,
  ariaLabel,
  className = "flex flex-wrap gap-2",
  transition = false,
}: {
  items: TabPillItem[];
  ariaLabel: string;
  className?: string;
  /** Adds `transition-colors` (used by the section navs). */
  transition?: boolean;
}) {
  return (
    <nav className={className} aria-label={ariaLabel}>
      {items.map((item) => (
        <Link
          key={item.key ?? item.href}
          href={item.href}
          className={`rounded-full px-4 py-2 text-sm font-medium${transition ? " transition-colors" : ""} ${
            item.active
              ? "bg-primary text-white"
              : "border border-border text-foreground hover:bg-accent-muted/50"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
