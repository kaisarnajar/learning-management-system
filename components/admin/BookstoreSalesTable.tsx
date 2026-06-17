import { formatPrice } from "@/lib/courses";
import type { BookSalesRecord } from "@/lib/finance-bookstore";
import Link from "next/link";

type BookstoreSalesTableProps = {
  records: BookSalesRecord[];
};

export function BookstoreSalesTable({ records }: BookstoreSalesTableProps) {
  if (records.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No sales records found for this period.
      </p>
    );
  }

  return (
    <table className="w-full min-w-[900px] text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Book</th>
          <th className="px-4 py-3 font-medium text-right">Purchase Price</th>
          <th className="px-4 py-3 font-medium text-right">Selling Price</th>
          <th className="px-4 py-3 font-medium text-right">Procured</th>
          <th className="px-4 py-3 font-medium text-right">Sold</th>
          <th className="px-4 py-3 font-medium text-right">Stock</th>
          <th className="px-4 py-3 font-medium text-right">Revenue</th>
          <th className="px-4 py-3 font-medium text-right">Profit</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {records.map((record) => {
          const profitPositive = record.profitPaise >= 0;
          return (
            <tr key={record.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">
                  <Link href={`/admin/bookstore/${record.id}`} className="hover:underline">
                    {record.title}
                  </Link>
                </div>
                <div className="text-xs text-muted">{record.author}</div>
              </td>
              <td className="px-4 py-3 text-right">{formatPrice(record.purchasePriceInrPaise)}</td>
              <td className="px-4 py-3 text-right">{formatPrice(record.sellingPriceInrPaise)}</td>
              <td className="px-4 py-3 text-right">{record.quantityPurchased}</td>
              <td className="px-4 py-3 text-right">{record.quantitySold}</td>
              <td className="px-4 py-3 text-right">
                <span className={record.remainingStock <= 5 ? "text-destructive-text font-medium" : ""}>
                  {record.remainingStock}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-medium text-foreground">
                {formatPrice(record.revenuePaise)}
              </td>
              <td className={`px-4 py-3 text-right font-medium ${profitPositive ? "text-emerald-700" : "text-red-700"}`}>
                {formatPrice(record.profitPaise)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
