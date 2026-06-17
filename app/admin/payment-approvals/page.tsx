import { PendingPaymentApprovalsTable } from "@/components/admin/PendingPaymentApprovalsTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { getAllCourses } from "@/lib/courses";
import {
  getPendingEnrollmentFeePaymentsPaginated,
  getPendingMonthlyPaymentsPaginated,
} from "@/lib/monthly-payments";
import { APPROVAL_PAGE_SIZE, clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

export default async function AdminPaymentApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string; declined?: string; page?: string; monthlyPage?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: enrollmentPage, pageSize: enrollmentPageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
  });
  const { page: monthlyPage, pageSize: monthlyPageSize } = parsePaginationParams(params, {
    pageSize: APPROVAL_PAGE_SIZE,
    pageParam: "monthlyPage",
  });

  const [enrollmentFeesPaginated, monthlyFeesPaginated, courses] = await Promise.all([
    getPendingEnrollmentFeePaymentsPaginated(enrollmentPage, enrollmentPageSize, q),
    getPendingMonthlyPaymentsPaginated(monthlyPage, monthlyPageSize, q),
    getAllCourses(),
  ]);

  const pendingEnrollmentFees = enrollmentFeesPaginated.items;
  const pendingMonthlyFees = monthlyFeesPaginated.items;
  const enrollmentTotalCount = enrollmentFeesPaginated.totalCount;
  const monthlyTotalCount = monthlyFeesPaginated.totalCount;
  const safeEnrollmentPage = clampPage(enrollmentPage, enrollmentTotalCount, enrollmentPageSize);
  const safeMonthlyPage = clampPage(monthlyPage, monthlyTotalCount, monthlyPageSize);

  const titleById = new Map(courses.map((c) => [c.id, c.title]));

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Payment approvals</h1>
      <p className="mt-1 text-sm text-muted">
        Verify enrollment and monthly fee payments submitted by students. Free enrollment requests
        are managed under Enrollments.
      </p>
      {params.confirmed === "1" && (
        <p className="mt-4 rounded-md bg-info-bg px-4 py-3 text-sm text-info-text">
          Payment approved and recorded.
        </p>
      )}
      {params.declined === "1" && (
        <p className="mt-4 rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          Payment declined. The student has been notified and can resubmit.
        </p>
      )}

      <div className="mt-6">
        <ListSearchForm
          action="/admin/payment-approvals"
          query={q}
          placeholder="Search by name, email, course, or reference"
          preserveParams={{ monthlyPage: params.monthlyPage }}
          totalCount={q ? enrollmentTotalCount + monthlyTotalCount : undefined}
        />
      </div>

      <section id="enrollment-fees" className="mt-8 scroll-mt-6">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Enrollment fee approvals
          {enrollmentTotalCount > 0 && (
            <span className="ml-2 inline-flex rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning-text">
              {enrollmentTotalCount}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Approve to activate the student&apos;s enrollment in the paid course.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <PendingPaymentApprovalsTable
            submissions={pendingEnrollmentFees}
            courseTitleById={titleById}
            emptyMessage={
              q
                ? "No enrollment fee payments match your search."
                : "No enrollment fee payments awaiting verification."
            }
          />
        </div>

        <Pagination
          basePath="/admin/payment-approvals"
          params={params}
          page={safeEnrollmentPage}
          totalCount={enrollmentTotalCount}
          pageSize={enrollmentPageSize}
        />
      </section>

      <section id="monthly-fees" className="mt-10 scroll-mt-6">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Monthly fee approvals
          {monthlyTotalCount > 0 && (
            <span className="ml-2 inline-flex rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning-text">
              {monthlyTotalCount}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Verify monthly fee payments from active enrollments.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <PendingPaymentApprovalsTable
            submissions={pendingMonthlyFees}
            courseTitleById={titleById}
            emptyMessage={
              q
                ? "No monthly fee payments match your search."
                : "No monthly fee payments awaiting verification."
            }
          />
        </div>

        <Pagination
          basePath="/admin/payment-approvals"
          params={params}
          page={safeMonthlyPage}
          totalCount={monthlyTotalCount}
          pageSize={monthlyPageSize}
          pageParam="monthlyPage"
        />
      </section>
    </div>
  );
}
