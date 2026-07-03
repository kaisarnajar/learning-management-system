"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { formatPrice } from "@/lib/courses";
import { incomePaymentTypeLabel } from "@/lib/monthly-payment-status";
import { ReceiptActionButtons } from "@/components/payment/ReceiptActionButtons";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteManualPaymentRecord } from "@/app/admin/payments/actions";
import { useToast } from "@/components/shared/ToastProvider";
import { getReturnToUrl } from "@/components/shared/ActionButton";

type ManualTransactionRecord = {
  id: string;
  amountInrPaise: number;
  paidAt: Date;
  paymentType: string | null;
  description: string | null;
  receiptGeneratedAt: Date | null;
  user: { id: string; name: string | null; email: string };
  course: { id: string; title: string } | null;
};

type ManualTransactionsTableProps = {
  records: ManualTransactionRecord[];
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ManualTransactionsTable({ records }: ManualTransactionsTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);
  const { addToast } = useToast();

  if (records.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No manually added transactions found.
      </p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="border-b border-border bg-background/50 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Course</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium" />
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
              <td className="px-4 py-3 text-muted">
                {incomePaymentTypeLabel(record.paymentType)}
              </td>
              <td className="px-4 py-3 font-medium text-success-text">
                {formatPrice(record.amountInrPaise)}
              </td>
              <td className="px-4 py-3 text-muted">{record.description ?? "—"}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <ReceiptActionButtons
                    paymentRecordId={record.id}
                    receiptGeneratedAt={record.receiptGeneratedAt}
                    isAdmin
                    label="View Receipt"
                  />
                  <DeleteActionButton
                    action={async () => {
                      const result = await deleteManualPaymentRecord(record.id, returnTo);
                      if (result && "error" in result && result.error) {
                        addToast(result.error, "error");
                      }
                    }}
                    itemName="payment record"
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
