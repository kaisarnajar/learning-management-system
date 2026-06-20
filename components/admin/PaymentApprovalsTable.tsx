import Image from "next/image";
import { ConfirmMonthlyPaymentButton } from "@/components/admin/ConfirmMonthlyPaymentButton";
import { DeclineMonthlyPaymentButton } from "@/components/admin/DeclineMonthlyPaymentButton";
import { DeletePaymentButton } from "@/components/admin/DeletePaymentButton";
import { formatPrice } from "@/lib/courses";
import type { CoursePaymentSubmissionWithUser } from "@/lib/monthly-payments";
import { MONTHLY_PAYMENT_APPROVED } from "@/lib/monthly-payment-status";

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
                {submission.status === MONTHLY_PAYMENT_APPROVED ? (
                  <>
                    {submission.paymentScreenshotPath && (
                      <a
                        href={submission.paymentScreenshotPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md border border-primary bg-transparent px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10 ml-2"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="mr-1 h-3 w-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                        View Receipt
                      </a>
                    )}
                    <DeletePaymentButton submissionId={submission.id} />
                  </>
                ) : (
                  <>
                    <ConfirmMonthlyPaymentButton submissionId={submission.id} />
                    <DeclineMonthlyPaymentButton submissionId={submission.id} />
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}
