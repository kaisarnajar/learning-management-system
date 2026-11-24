import Link from "next/link";

type ErrorStateProps = {
  /** Small label above the heading, e.g. "404" or "Error". */
  eyebrow: string;
  title: string;
  message: string;
  /** Where the secondary link goes; the home page by default. */
  homeHref?: string;
  homeLabel?: string;
  /** Shown as a "Try again" button when given (error boundaries pass `retry`). */
  onRetry?: () => void;
  /** Server error digest, so a user can quote it when reporting the problem. */
  digest?: string;
};

/**
 * The branded body shared by not-found.tsx, error.tsx and global-error.tsx.
 * It has no hooks so it renders in server and client components alike.
 */
export function ErrorState({ eyebrow, title, message, homeHref = "/", homeLabel = "Back to home", onRetry, digest }: ErrorStateProps) {
  return (
    <section className="flex min-h-[60vh] w-full items-center justify-center px-4 py-16" data-testid="error-state">
      <div className="max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand-gold">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold text-primary sm:text-4xl">{title}</h1>
        <p className="mt-4 text-base text-muted">{message}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-light"
            >
              Try again
            </button>
          ) : null}
          <Link
            href={homeHref}
            className="inline-flex h-10 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold text-primary transition-colors hover:bg-surface-muted"
          >
            {homeLabel}
          </Link>
        </div>
        {digest ? <p className="mt-6 text-xs text-muted">Reference: {digest}</p> : null}
      </div>
    </section>
  );
}

/** The digest Next attaches to server errors, when there is one. */
export function errorDigest(error: unknown): string | undefined {
  if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string") return error.digest;
  return undefined;
}
