import Link from "next/link";
import { formatPrice } from "@/lib/courses";
import { incomePaymentTypeLabel } from "@/lib/monthly-payment-status";

type IncomeRecord = {
  id: string;
  amountInrPaise: number;
  paidAt: Date;
  paymentType: string | null;
  description: string | null;
  user: { id: string; name: string | null; email: string };
  course: { id: string; title: string } | null;
};

type FinanceIncomeTableProps = {
  records: IncomeRecord[];
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FinanceIncomeTable({ records }: FinanceIncomeTableProps) {
  if (records.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">No income records for these filters.</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[880px] text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-xs uppercase tracking-wide text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Date</th>
          <th className="px-4 py-3 font-medium">Student</th>
          <th className="px-4 py-3 font-medium">Course</th>
          <th className="px-4 py-3 font-medium">Type</th>
          <th className="px-4 py-3 font-medium">Amount</th>
          <th className="px-4 py-3 font-medium">Description</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {records.map((record) => (
          <tr key={record.id} className="hover:bg-background/30">
            <td className="px-4 py-3 text-muted">{formatDate(record.paidAt)}</td>
            <td className="px-4 py-3">
              <Link
                href={`/admin/students/${record.user.id}`}
                className="font-medium text-primary hover:underline"
              >
                {record.user.name?.trim() || record.user.email}
              </Link>
            </td>
            <td className="px-4 py-3 text-muted">{record.course?.title ?? "—"}</td>
            <td className="px-4 py-3 text-muted">{incomePaymentTypeLabel(record.paymentType)}</td>
            <td className="px-4 py-3 font-medium text-emerald-700">{formatPrice(record.amountInrPaise)}</td>
            <td className="px-4 py-3 text-muted">{record.description ?? "—"}</td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}
