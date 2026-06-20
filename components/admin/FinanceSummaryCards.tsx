import { formatPrice } from "@/lib/courses";

type FinanceSummaryCardsProps = {
  incomeTotal: number;
  expenseTotal: number;
};

export function FinanceSummaryCards({ incomeTotal, expenseTotal }: FinanceSummaryCardsProps) {
  const netBalance = incomeTotal - expenseTotal;
  const netPositive = netBalance >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Total income</p>
        <p className="mt-1 text-2xl font-bold text-success-text">{formatPrice(incomeTotal)}</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Total expenses</p>
        <p className="mt-1 text-2xl font-bold text-destructive-text">{formatPrice(expenseTotal)}</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Net balance</p>
        <p
          className={`mt-1 text-2xl font-bold ${netPositive ? "text-success-text" : "text-destructive-text"}`}
        >
          {formatPrice(netBalance)}
        </p>
      </div>
    </div>
  );
}
