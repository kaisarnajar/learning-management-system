import { formatPrice } from "@/services/courses";

type FinanceFilteredSummaryProps = {
  recordCount: number;
  totalPaise: number;
  variant: "income" | "expense";
};

export function FinanceFilteredSummary({
  recordCount,
  totalPaise,
  variant,
}: FinanceFilteredSummaryProps) {
  const amountClass = variant === "income" ? "text-success-text" : "text-destructive-text";

  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Filtered results</p>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted">Total records</p>
          <p className="mt-0.5 text-2xl font-bold text-foreground">
            {recordCount.toLocaleString("en-IN")}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted">Total amount</p>
          <p className={`mt-0.5 text-2xl font-bold ${amountClass}`}>{formatPrice(totalPaise)}</p>
        </div>
      </div>
    </div>
  );
}
