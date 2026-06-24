import Link from "next/link";
import type { FatwaQuestion } from "@prisma/client";
import { excerpt } from "@/lib/fatwa";

type FatwaCardProps = {
  fatwa: FatwaQuestion;
};

export function FatwaCard({ fatwa }: FatwaCardProps) {
  return (
    <article className="card-elevated flex h-full flex-col p-5 transition-transform hover:-translate-y-0.5 sm:p-6">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-accent-muted px-2.5 py-0.5 text-xs font-semibold text-primary">
          {fatwa.category}
        </span>
        {fatwa.answeredAt && (
          <span className="text-xs text-muted">
            {fatwa.answeredAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
      </div>
      <h3 className="font-serif text-base font-semibold text-foreground sm:text-lg">
        <Link href={`/fatwa/${fatwa.id}`} className="hover:text-primary">
          {fatwa.title}
        </Link>
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted line-clamp-3">
        {excerpt(fatwa.question)}
      </p>
      <div className="mt-auto pt-4">
        <p className="text-xs text-muted">Asked by {fatwa.askerName}</p>
        <Link
          href={`/fatwa/${fatwa.id}`}
          className="mt-2 inline-block text-sm font-semibold text-accent hover:text-primary"
        >
          Read answer →
        </Link>
      </div>
    </article>
  );
}
