"use client";

import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { getReturnToUrl } from "@/components/shared/ActionButton";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { confirmMonthlyPayment, declineMonthlyPayment, deleteApprovedPayment } from "@/app/admin/payments/actions";
import { ReceiptActionButtons } from "@/components/payment/ReceiptActionButtons";
import { formatPrice } from "@/services/courses";
import type { CoursePaymentSubmissionWithUser } from "@/services/monthly-payments";
import { MONTHLY_PAYMENT_APPROVED } from "@/services/monthly-payment-status";
import { useToast } from "@/components/shared/ToastProvider";

type PaymentApprovalsTableProps = {
  submissions: CoursePaymentSubmissionWithUser[];
  courseTitleById: Map<string, string>;
  emptyMessage: string;
};

export function PaymentApprovalsTable({
  submissions,
  courseTitleById,
  emptyMessage,
}: PaymentApprovalsTableProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const returnTo = getReturnToUrl(pathname, searchParams);

  if (submissions.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium">Email</th>
          <th className="px-4 py-3 font-medium">Course</th>
          <th className="px-4 py-3 font-medium">Description</th>
          <th className="px-4 py-3 font-medium">Method</th>
          <th className="px-4 py-3 font-medium">Reference</th>
          <th className="px-4 py-3 font-medium">Screenshot</th>
          <th className="px-4 py-3 font-medium">Amount</th>
          <th className="px-4 py-3 font-medium">Submitted</th>
          <th className="px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {submissions.map((submission) => (
          <tr key={submission.id}>
            <td className="px-4 py-3 font-medium text-foreground">{submission.user.name ?? "—"}</td>
            <td className="px-4 py-3 text-muted">{submission.user.email}</td>
            <td className="px-4 py-3 text-foreground">
              {courseTitleById.get(submission.courseId) ?? submission.courseId}
            </td>
            <td className="px-4 py-3 text-foreground">{submission.label}</td>
            <td className="px-4 py-3 capitalize text-muted">
              {submission.paymentMethod ?? "—"}
            </td>
            <td className="px-4 py-3 font-mono text-xs text-muted">
              {submission.upiTransactionId ?? "—"}
            </td>
            <td className="px-4 py-3">
              {submission.paymentScreenshotPath ? (
                <div className="flex flex-col gap-1.5">
                  {submission.paymentScreenshotPath.toLowerCase().endsWith(".pdf") ? (
                    <div className="flex h-14 w-14 items-center justify-center rounded border border-border bg-accent-muted text-muted">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                  ) : (
                    <a
                      href={submission.paymentScreenshotPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden"
                    >
                      <Image
                        src={submission.paymentScreenshotPath}
                        alt="Payment screenshot"
                        width={64}
                        height={64}
                        className="h-14 w-14 rounded border border-border object-cover transition-opacity hover:opacity-80"
                        unoptimized
                      />
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-muted">—</span>
              )}
            </td>
            <td className="px-4 py-3 text-muted">{formatPrice(submission.amountInrPaise)}</td>
            <td className="px-4 py-3 text-muted">
              {submission.updatedAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </td>
            <td className="whitespace-nowrap px-4 py-3">
              <div className="flex items-center justify-end gap-2">
                {submission.status === MONTHLY_PAYMENT_APPROVED && submission.paymentRecordId && (
                  <ReceiptActionButtons
                     paymentRecordId={submission.paymentRecordId}
                     receiptGeneratedAt={submission.paymentRecord?.receiptGeneratedAt || null}
                     isAdmin
                     label="View Receipt"
                  />
                )}
                {submission.status !== MONTHLY_PAYMENT_APPROVED && (
                  <>
                    <ConfirmationModal 
                      title="Confirm Payment" 
                      description="Approve this payment and notify the student?" 
                      actionLabel="Confirm" 
                      variant="primary" 
                      onConfirm={async () => { 
                        const result = await confirmMonthlyPayment(submission.id, returnTo); 
                        if (result?.error) addToast(result.error, "error"); 
                      }} 
                      trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light transition-colors">Confirm</button>} 
                    />
                    <ConfirmationModal 
                      title="Decline Payment" 
                      description="Decline this payment and ask the student to resubmit?" 
                      actionLabel="Decline" 
                      variant="destructive" 
                      onConfirm={async () => { 
                        const result = await declineMonthlyPayment(submission.id, returnTo); 
                        if (result?.error) addToast(result.error, "error"); 
                      }} 
                      trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Decline</button>} 
                    />
                  </>
                )}
                <DeleteActionButton
                  action={async () => {
                     const result = await deleteApprovedPayment(submission.id, returnTo);
                     if (result?.error) addToast(result.error, "error");
                  }}
                  itemName="payment"
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
