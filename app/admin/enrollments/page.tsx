import Link from "next/link";
import { AdminEnrollUserForm } from "@/components/admin/AdminEnrollUserForm";
import { EnrollmentRequestsTable } from "@/components/admin/EnrollmentRequestsTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { isCourseEnrollmentOpen } from "@/lib/course-status";
import { getAllCourses } from "@/lib/courses";
import {
  getAwaitingEnrollmentFeeEnrollmentsPaginated,
  getPendingFreeEnrollmentApprovalsPaginated,
} from "@/lib/enrollments";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";
import { ActionToast } from "@/components/shared/ToastProvider";

type TabType = "free_requests" | "paid_awaiting";

function tabHref(type: TabType) {
  const params = new URLSearchParams();
  if (type !== "free_requests") params.set("type", type);
  const qs = params.toString();
  return qs ? `/admin/enrollments?${qs}` : "/admin/enrollments";
}

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string; q?: string; approved?: string; rejected?: string; }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  
  const validTypes: TabType[] = ["free_requests", "paid_awaiting"];
  const type: TabType = validTypes.includes(params.type as TabType) ? (params.type as TabType) : "free_requests";

  const { page: requestedPage, pageSize } = parsePaginationParams(params);

  // We only fetch full paginated data for the active tab, and just count/minimal data for inactive ones.
  const [courses, freeResult, paidResult] = await Promise.all([
    getAllCourses(),
    type === "free_requests" 
      ? getPendingFreeEnrollmentApprovalsPaginated(requestedPage, pageSize, q)
      : getPendingFreeEnrollmentApprovalsPaginated(1, 1, q), // minimal for count
    type === "paid_awaiting"
      ? getAwaitingEnrollmentFeeEnrollmentsPaginated(requestedPage, pageSize, q)
      : getAwaitingEnrollmentFeeEnrollmentsPaginated(1, 1, q), // minimal for count
  ]);

  const freeTotalCount = freeResult.totalCount;
  const paidTotalCount = paidResult.totalCount;
  
  const activeResult = type === "free_requests" ? freeResult : paidResult;
  const safePage = clampPage(requestedPage, activeResult.totalCount, pageSize);

  const titleById = new Map(courses.map((c) => [c.id, c.title]));
  const enrollableCourses = courses.filter((c) => isCourseEnrollmentOpen(c.status));

  const tabs = [
    { label: "Free Enrollment Requests", value: "free_requests" as TabType, count: freeTotalCount, showBadge: true },
    { label: "Paid Courses Awaiting Fee", value: "paid_awaiting" as TabType, count: paidTotalCount, showBadge: true },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Course enrollments</h1>
      <p className="mt-1 text-sm text-muted">
        Approve free enrollment requests here. Paid courses are activated after you verify the
        enrollment fee under Payments.
      </p>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Enrollment type">
        {tabs.map((item) => {
          const active = type === item.value;
          const href = tabHref(item.value);
          return (
            <Link
              key={item.value}
              href={href}
              className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary text-white"
                  : "bg-surface text-foreground hover:bg-background/80 border border-border"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
              {item.showBadge && item.count > 0 && (
                <span
                  className={`ml-2 inline-flex h-5 items-center justify-center rounded-full px-2 text-xs font-semibold ${
                    active ? "bg-white/20 text-white" : "bg-warning-bg text-warning-text"
                  }`}
                >
                  {item.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <ActionToast trigger={params.approved === "1"} paramName="approved" message="Enrollment approved. The student has been notified by email — if they don't see it, ask them to check their Spam/Junk folder." variant="success" />
      <ActionToast trigger={params.rejected === "1"} paramName="rejected" message="Enrollment rejected. The student has been notified by email — if they don't see it, ask them to check their Spam/Junk folder." variant="warning" />

      <div className="mt-6">
        <ListSearchForm
          action="/admin/enrollments"
          query={q}
          placeholder="Search by student name, email, or course"
          preserveParams={{ type: params.type }}
          totalCount={q ? activeResult.totalCount : undefined}
        />
      </div>

      <section className="mt-8">
        {type === "free_requests" ? (
          <>
            <p className="text-sm text-muted">
              Courses with no enrollment fee. Approve to grant access immediately.
            </p>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
              <EnrollmentRequestsTable
                enrollments={activeResult.items}
                courseTitleById={titleById}
                emptyMessage={
                  q
                    ? "No free enrollment requests match your search."
                    : "No free enrollment requests awaiting approval."
                }
                showApprove
              />
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="text-sm text-muted">
                Students must pay the enrollment fee first. Once they submit payment, verify it under
                enrollment fee approvals — approving payment activates the enrollment automatically.
              </p>
              <Link
                href="/admin/payments#enrollment-fees"
                className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
              >
                Go to enrollment fee approvals
              </Link>
            </div>
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
              <EnrollmentRequestsTable
                enrollments={activeResult.items}
                courseTitleById={titleById}
                emptyMessage={
                  q
                    ? "No paid enrollments match your search."
                    : "No paid enrollments awaiting student payment."
                }
                showApprove={false}
                showReject={false}
              />
            </div>
          </>
        )}

        <Pagination
          basePath="/admin/enrollments"
          params={params}
          page={safePage}
          totalCount={activeResult.totalCount}
          pageSize={pageSize}
        />
      </section>

      <section className="mt-16 border-t border-border pt-10">
        <AdminEnrollUserForm courses={enrollableCourses} />
      </section>
    </div>
  );
}
