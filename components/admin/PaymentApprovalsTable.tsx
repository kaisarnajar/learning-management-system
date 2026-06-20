import Image from "next/image";
import { ConfirmMonthlyPaymentButton } from "@/components/admin/ConfirmMonthlyPaymentButton";
import { DeclineMonthlyPaymentButton } from "@/components/admin/DeclineMonthlyPaymentButton";
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
                <a
                  href={submission.paymentScreenshotPath}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src={submission.paymentScreenshotPath}
                    alt="Payment screenshot"
                    width={64}
                    height={64}
                    className="h-14 w-14 rounded border border-border object-cover"
                    unoptimized
                  />
                </a>
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
                  <span className="inline-flex items-center rounded-full bg-success-bg px-2.5 py-0.5 text-xs font-semibold text-success-text">
                    Approved
                  </span>
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
