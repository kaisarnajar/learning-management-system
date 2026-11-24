type FinanceExportLinkProps = {
  href: string;
  /** False for an all-time range: the export needs a bounded date range. */
  hasDateRange: boolean;
  className?: string;
};

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-surface px-5 py-2 text-sm font-semibold whitespace-nowrap";

/** "Export to Excel", or a disabled hint when the page shows all time. */
export function FinanceExportLink({ href, hasDateRange, className = "" }: FinanceExportLinkProps) {
  if (!hasDateRange) {
    return (
      <span
        aria-disabled="true"
        title="Choose a date range to export"
        className={`${BUTTON_CLASS} cursor-not-allowed text-muted opacity-60 ${className}`}
      >
        Export to Excel
      </span>
    );
  }
  return (
    <a href={href} className={`${BUTTON_CLASS} text-foreground hover:bg-accent-muted/50 ${className}`}>
      Export to Excel
    </a>
  );
}
