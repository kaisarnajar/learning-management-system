import { ReceiptActionButtons } from "@/components/payment/ReceiptActionButtons";
import { Pagination } from "@/components/shared/Pagination";
import { formatPrice, getAllCourses } from "@/lib/courses";
import { requireUser } from "@/lib/auth-actions";
import {
  monthlyPaymentStatusClass,
  monthlyPaymentStatusLabel,
} from "@/lib/monthly-payment-status";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { getPaymentRecordsForUserPaginated, getPaymentSubmissionsForUser } from "@/lib/payments";

export default async function ProfilePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string; declined?: string; page?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const { page: requestedPage, pageSize } = parsePaginationParams(params);

  const [paymentsPaginated, submissions, courses] = await Promise.all([
    getPaymentRecordsForUserPaginated(session.user.id, requestedPage, pageSize),
    getPaymentSubmissionsForUser(session.user.id),
    getAllCourses(),
  ]);

  const payments = paymentsPaginated.items;
  const paymentTotalCount = paymentsPaginated.totalCount;
  const page = clampPage(requestedPage, paymentTotalCount, pageSize);

  const titleById = new Map(courses.map((c) => [c.id, c.title]));
  const pendingSubmissions = submissions.filter((s) => s.status !== "approved");

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-foreground">Payments</h2>
      <p className="mt-1 text-sm text-muted">
        Approved monthly fees and your submitted payments awaiting verification.
      </p>

      {params.submitted === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Payment submitted. The academy will verify it shortly.
        </p>
      )}
      {params.declined === "1" && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text">
          Your previous payment was declined. You can submit again from My Courses.
        </p>
      )}

      <section className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Awaiting approval</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface">
          {pendingSubmissions.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">No pending payment submissions.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-background/50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Submitted</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingSubmissions.map((submission) => (
                  <tr key={submission.id}>
                    <td className="px-4 py-3 text-muted">
                      {submission.createdAt.toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {titleById.get(submission.courseId) ?? submission.courseId}
                    </td>
                    <td className="px-4 py-3 text-muted">{submission.label}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatPrice(submission.amountInrPaise)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${monthlyPaymentStatusClass(submission.status)}`}
                      >
                        {monthlyPaymentStatusLabel(submission.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Payment history</h3>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface">
          {paymentTotalCount === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">No approved payments recorded yet.</p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-border bg-background/50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3 text-muted">
                      {payment.paidAt.toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatPrice(payment.amountInrPaise)}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {payment.courseId
                        ? (titleById.get(payment.courseId) ?? payment.courseId)
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted">{payment.description ?? "—"}</td>
                    <td className="px-4 py-3">
                      <ReceiptActionButtons 
                        paymentRecordId={payment.id} 
                        receiptGeneratedAt={payment.receiptGeneratedAt}
                        isAdmin={false}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          basePath="/profile/payments"
          params={params}
          page={page}
          totalCount={paymentTotalCount}
          pageSize={pageSize}
        />
      </section>
    </div>
  );
}
