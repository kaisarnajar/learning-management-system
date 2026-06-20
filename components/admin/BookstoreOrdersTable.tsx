import { formatPrice } from "@/lib/courses";
import type { BookOrderFinanceRecord } from "@/lib/finance-bookstore";
import { bookOrderStatusClass, bookOrderStatusLabel } from "@/lib/bookstore";
import Link from "next/link";

type BookstoreOrdersTableProps = {
  records: BookOrderFinanceRecord[];
};

export function BookstoreOrdersTable({ records }: BookstoreOrdersTableProps) {
  if (records.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No orders found for this period.
      </p>
    );
  }

  return (
    <table className="w-full min-w-[900px] text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Order ID / Date</th>
          <th className="px-4 py-3 font-medium">Customer</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium text-right">Order Total</th>
          <th className="px-4 py-3 font-medium text-right">Profit Contribution</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {records.map((record) => {
          const profitPositive = record.profitContributionPaise >= 0;
          return (
            <tr key={record.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">
                  <Link href={`/admin/bookstore/orders/${record.id}`} className="hover:underline">
                    {record.id.slice(-8).toUpperCase()}
                  </Link>
                </div>
                <div className="text-xs text-muted">
                  {record.orderDate.toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">{record.customerName}</div>
                <div className="text-xs text-muted">{record.customerEmail}</div>
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${bookOrderStatusClass(record.status)}`}>
                  {bookOrderStatusLabel(record.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-foreground">
                {formatPrice(record.totalAmountPaise)}
              </td>
              <td className={`px-4 py-3 text-right font-medium ${profitPositive ? "text-success-text" : "text-destructive-text"}`}>
                {formatPrice(record.profitContributionPaise)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
