"use client";

import Link from "next/link";
import { AdminReceiptEntry } from "@/lib/receipts-admin";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteReceipt } from "@/app/actions/receipts";
import { useToast } from "@/components/shared/ToastProvider";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";

type AdminReceiptsTableProps = {
  receipts: AdminReceiptEntry[];
  emptyMessage: string;
};

export function AdminReceiptsTable({
  receipts,
  emptyMessage,
}: AdminReceiptsTableProps) {
  const { addToast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const returnTo = getReturnToUrl(pathname, searchParams);

  if (receipts.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1000px] text-left text-sm">
        <thead className="border-b border-border bg-background/50 text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Receipt Number</th>
            <th className="px-4 py-3 font-medium">Student Name</th>
            <th className="px-4 py-3 font-medium">Payment Type</th>
            <th className="px-4 py-3 font-medium">Course</th>
            <th className="px-4 py-3 font-medium text-right">Amount</th>
            <th className="px-4 py-3 font-medium text-center">GST Included</th>
            <th className="px-4 py-3 font-medium">Date Generated</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {receipts.map((receipt) => (
            <tr key={receipt.id} className="transition-colors hover:bg-accent-muted/50">
              <td className="px-4 py-3 font-mono text-foreground">
                {receipt.invoiceNumber}
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-foreground">
                  {receipt.user.name || "N/A"}
                </div>
                <div className="text-xs text-muted">{receipt.user.email}</div>
              </td>
              <td className="px-4 py-3 text-foreground capitalize">
                {receipt.paymentType?.replace(/_/g, " ") || "N/A"}
              </td>
              <td className="px-4 py-3 text-foreground">
                {receipt.course?.title || "—"}
              </td>
              <td className="px-4 py-3 text-right font-medium text-foreground">
                ₹{(receipt.amountInrPaise / 100).toFixed(2)}
              </td>
              <td className="px-4 py-3 text-center">
                {receipt.receiptIncludesGst ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Yes
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                    No
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-muted">
                {receipt.receiptGeneratedAt.toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/api/receipt/${receipt.id}`}
                    target="_blank"
                    className="inline-flex min-h-8 items-center justify-center rounded-md border border-primary bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  >
                    View
                  </Link>
                  <DeleteActionButton
                    action={async () => {
                      const result = await deleteReceipt(receipt.id);
                      if (result?.error) {
                        addToast(result.error, "error");
                        return result;
                      }
                      addToast("Receipt deleted successfully.", "success");
                    }}
                    title="Delete"
                    itemName="receipt"
                    onSuccessRedirect={returnTo}
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
