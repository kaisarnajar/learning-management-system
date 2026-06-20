import { formatPrice } from "@/lib/courses";
import type { BookstoreFinanceSummary } from "@/lib/finance-bookstore";

export function BookstoreFinanceSummaryCards({ summary }: { summary: BookstoreFinanceSummary }) {
  const profitPositive = summary.totalProfitLossPaise >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Total Books Procured</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{summary.totalBooksPurchased}</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Total Books Sold</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{summary.totalBooksSold}</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Current Inventory</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{summary.currentInventoryCount}</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Average Order Value</p>
        <p className="mt-1 text-2xl font-bold text-foreground">{formatPrice(summary.averageOrderValuePaise)}</p>
      </div>

      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Total Purchase Cost</p>
        <p className="mt-1 text-2xl font-bold text-destructive-text">{formatPrice(summary.totalPurchaseCostPaise)}</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Total Sales Revenue</p>
        <p className="mt-1 text-2xl font-bold text-success-text">{formatPrice(summary.totalSalesRevenuePaise)}</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Total Profit / Loss</p>
        <p
          className={`mt-1 text-2xl font-bold ${profitPositive ? "text-success-text" : "text-destructive-text"}`}
        >
          {formatPrice(summary.totalProfitLossPaise)}
        </p>
      </div>
      
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Pending Orders Value</p>
        <p className="mt-1 text-xl font-bold text-warning-text">{formatPrice(summary.pendingOrdersValuePaise)}</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Approved Orders Value</p>
        <p className="mt-1 text-xl font-bold text-success-text">{formatPrice(summary.approvedOrdersValuePaise)}</p>
      </div>
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <p className="text-sm text-muted">Completed Orders Value</p>
        <p className="mt-1 text-xl font-bold text-info-text">{formatPrice(summary.completedOrdersValuePaise)}</p>
      </div>
    </div>
  );
}
