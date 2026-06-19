import Image from "next/image";
import { TrackedLink } from "@/components/analytics/TrackedLink";
import type { LibraryItem } from "@/lib/library";

type LibraryCardProps = {
  item: LibraryItem & { imagePath?: string | null };
};

export function LibraryCard({ item }: LibraryCardProps) {
  return (
    <article className="card-elevated flex flex-col overflow-hidden">
      {item.imagePath && (
        <div className="relative aspect-video w-full overflow-hidden bg-accent-muted/30">
          <Image
            src={item.imagePath}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <span className="w-fit rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold text-primary">
          {item.topic}
        </span>
        <h3 className="mt-3 font-serif text-base font-semibold text-foreground sm:text-lg">{item.title}</h3>
        <p className="mt-1 text-sm text-muted">by {item.author}</p>
        <div className="mt-auto pt-4">
          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded-lg bg-background px-2.5 py-1">{item.level}</span>
            <span className="rounded-lg bg-background px-2.5 py-1">{item.language}</span>
          </div>
          {item.pdfUrl ? (
            <TrackedLink
              href={item.pdfUrl}
              eventName="Download Resource"
              pageName="/library"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex min-h-11 w-full items-center justify-center rounded-full bg-primary px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-light"
            >
              View PDF
            </TrackedLink>
          ) : (
            <button
              type="button"
              disabled
              className="mt-4 min-h-11 w-full cursor-not-allowed rounded-full border border-border bg-background px-4 py-3 text-sm font-medium text-muted"
            >
              PDF Coming Soon
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
