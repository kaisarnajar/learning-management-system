import Link from "next/link";
import { SEARCH_PARAM } from "@/lib/text-search";

type ListSearchFormProps = {
  action: string;
  query?: string;
  placeholder?: string;
  preserveParams?: Record<string, string | undefined>;
  totalCount?: number;
};

function buildClearHref(
  action: string,
  preserveParams: Record<string, string | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(preserveParams)) {
    if (key === SEARCH_PARAM || value === undefined || value === "") continue;
    params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `${action}?${qs}` : action;
}

export function ListSearchForm({
  action,
  query,
  placeholder = "Search…",
  preserveParams = {},
  totalCount,
}: ListSearchFormProps) {
  const hiddenFields = Object.entries(preserveParams).filter(
    ([key, value]) => key !== SEARCH_PARAM && value !== undefined && value !== "",
  );

  return (
    <div className="space-y-2">
      <form method="get" action={action} className="flex flex-wrap items-center gap-2">
        {hiddenFields.map(([key, value]) => (
          <input key={key} type="hidden" name={key} value={value} />
        ))}

        <div className="relative w-full sm:w-auto sm:min-w-ui-200 flex-1 max-w-md">
          <input
            type="search"
            name={SEARCH_PARAM}
            defaultValue={query ?? ""}
            placeholder={placeholder}
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Search"
          />
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Search
        </button>

        {query && (
          <Link
            href={buildClearHref(action, preserveParams)}
            className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:bg-background/50"
          >
            Clear
          </Link>
        )}
      </form>

      {query && totalCount !== undefined && (
        <p className="text-sm text-muted">
          {totalCount === 0
            ? `No results for "${query}"`
            : `${totalCount} result${totalCount === 1 ? "" : "s"} for "${query}"`}
        </p>
      )}
    </div>
  );
}
