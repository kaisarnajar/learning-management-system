import Link from "next/link";

import { Pagination } from "@/components/shared/Pagination";
import { formatPrice, getAllCourses } from "@/lib/courses";
import { requireUser } from "@/lib/auth-actions";
import {
  monthlyPaymentStatusClass,
  monthlyPaymentStatusLabel,
} from "@/lib/monthly-payment-status";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { getPaymentRecordsForUserPaginated, getPaymentSubmissionsForUser } from "@/lib/payments";
import { ActionToast } from "@/components/shared/ToastProvider";
import { Suspense } from "react";

type TabType = "pending" | "history";

function tabHref(type: TabType) {
  const params = new URLSearchParams();
  if (type !== "pending") params.set("tab", type);
  const qs = params.toString();
  return qs ? `/profile/payments?${qs}` : "/profile/payments";
}

type PageParams = { submitted?: string; declined?: string; page?: string; tab?: string };

async function PaymentsContent({ params, userId }: { params: PageParams; userId: string }) {
  const { page: requestedPage, pageSize } = parsePaginationParams(params as any);
  
  const validTabs: TabType[] = ["pending", "history"];
  const currentTab: TabType = validTabs.includes(params.tab as TabType) ? (params.tab as TabType) : "pending";

  const [paymentsPaginated, submissions, courses] = await Promise.all([
    getPaymentRecordsForUserPaginated(userId, requestedPage, pageSize),
    getPaymentSubmissionsForUser(userId),
    getAllCourses(),
  ]);

  const payments = paymentsPaginated.items;
  const paymentTotalCount = paymentsPaginated.totalCount;
  const page = clampPage(requestedPage, paymentTotalCount, pageSize);

  const titleById = new Map(courses.map((c) => [c.id, c.title]));
  const pendingSubmissions = submissions.filter((s) => s.status !== "approved");
  
  const tabs = [
    { label: "Awaiting Approval", value: "pending" as TabType, count: pendingSubmissions.length, showBadge: true },
    { label: "Payment History", value: "history" as TabType, count: paymentTotalCount, showBadge: false },
  ];

  return (
    <>
      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Payment tabs">
        {tabs.map((item) => {
          const active = currentTab === item.value;
          const href = tabHref(item.value);
          return (
            <Link
              key={item.value}
              href={href}
              className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "bg-surface text-foreground hover:bg-accent-muted/50"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
              {item.showBadge && item.count > 0 && (
                <span
                  className={`ml-2 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    active ? "bg-surface/20 text-white" : "bg-warning-bg text-warning-text"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {currentTab === "pending" && (
        <section className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            {pendingSubmissions.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">No pending payment submissions.</p>
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
      )}

      {currentTab === "history" && (
        <section className="mt-6">
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            basePath="/profile/payments"
            params={params as any}
            page={page}
            totalCount={paymentTotalCount}
            pageSize={pageSize}
          />
        </section>
      )}
    </>
  );
}

function PaymentsSkeleton() {
  return (
    <>
      <div className="mt-8 flex gap-2">
        <div className="h-10 w-32 rounded-full bg-border/40 animate-pulse" />
        <div className="h-10 w-32 rounded-full bg-border/40 animate-pulse" />
      </div>
      <div className="mt-6 h-[300px] w-full rounded-lg bg-border/40 animate-pulse" />
    </>
  );
}

export default async function ProfilePaymentsPage({
  searchParams,
}: {
  searchParams: Promise<PageParams>;
}) {
  const session = await requireUser();
  const params = await searchParams;

  return (
    <div>
      <h2 className="font-serif text-lg font-semibold text-foreground">Payments</h2>
      <p className="mt-1 text-sm text-muted">
        Approved monthly fees and your submitted payments awaiting verification.
      </p>

      <ActionToast trigger={params.submitted === "1"} paramName="submitted" message="Payment submitted. The academy will verify it shortly." variant="info" />
      <ActionToast trigger={params.declined === "1"} paramName="declined" message="Your previous payment was declined. You can submit again from My Courses." variant="error" />

      <Suspense fallback={<PaymentsSkeleton />}>
        <PaymentsContent params={params} userId={session.user.id} />
      </Suspense>
    </div>
  );
}
