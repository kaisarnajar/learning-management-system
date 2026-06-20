import Link from "next/link";
import { AdminEnrollUserForm } from "@/components/admin/AdminEnrollUserForm";
import { ApproveEnrollmentButton } from "@/components/admin/ApproveEnrollmentButton";
import { RejectEnrollmentButton } from "@/components/admin/RejectEnrollmentButton";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { isCourseEnrollmentOpen } from "@/lib/course-status";
import { getAllCourses } from "@/lib/courses";
import {
  getAwaitingEnrollmentFeeEnrollmentsPaginated,
  getPendingFreeEnrollmentApprovalsPaginated,
  type PendingEnrollmentWithUser,
} from "@/lib/enrollments";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

function EnrollmentRequestsTable({
  enrollments,
  courseTitleById,
  emptyMessage,
  showApprove,
  showReject = true,
}: {
  enrollments: PendingEnrollmentWithUser[];
  courseTitleById: Map<string, string>;
  emptyMessage: string;
  showApprove: boolean;
  showReject?: boolean;
}) {
  if (enrollments.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Student</th>
          <th className="px-4 py-3 font-medium">Course</th>
          <th className="px-4 py-3 font-medium">Requested</th>
          <th className="px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {enrollments.map((enrollment) => (
          <tr key={enrollment.id}>
            <td className="px-4 py-3">
              <p className="font-medium text-foreground">{enrollment.user.name ?? "—"}</p>
              <p className="text-xs text-muted">{enrollment.user.email}</p>
            </td>
            <td className="px-4 py-3 text-foreground">
              {courseTitleById.get(enrollment.courseId) ?? enrollment.courseId}
            </td>
            <td className="px-4 py-3 text-muted">
              {enrollment.createdAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex flex-wrap justify-end gap-2">
                {showApprove && (
                  <ApproveEnrollmentButton
                    enrollmentId={enrollment.id}
                    courseId={enrollment.courseId}
                  />
                )}
                {showReject && (
                  <RejectEnrollmentButton
                    enrollmentId={enrollment.id}
                    courseId={enrollment.courseId}
                  />
                )}
                <Link
                  href={`/admin/students/${enrollment.user.id}`}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent-muted/50"
                >
                  Student profile
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}

export default async function AdminEnrollmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; paidPage?: string; q?: string }>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  const { page: freePage, pageSize } = parsePaginationParams(params);
  const { page: paidPage, pageSize: paidPageSize } = parsePaginationParams(params, {
    pageParam: "paidPage",
  });

  const [freePaginated, paidPaginated, courses] = await Promise.all([
    getPendingFreeEnrollmentApprovalsPaginated(freePage, pageSize, q),
    getAwaitingEnrollmentFeeEnrollmentsPaginated(paidPage, paidPageSize, q),
    getAllCourses(),
  ]);

  const freeEnrollmentRequests = freePaginated.items;
  const awaitingEnrollmentFee = paidPaginated.items;
  const freeTotalCount = freePaginated.totalCount;
  const paidTotalCount = paidPaginated.totalCount;
  const safeFreePage = clampPage(freePage, freeTotalCount, pageSize);
  const safePaidPage = clampPage(paidPage, paidTotalCount, paidPageSize);

  const titleById = new Map(courses.map((c) => [c.id, c.title]));
  const enrollableCourses = courses.filter((c) => isCourseEnrollmentOpen(c.status));

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Course enrollments</h1>
      <p className="mt-1 text-sm text-muted">
        Approve free enrollment requests here. Paid courses are activated after you verify the
        enrollment fee under Payments.
      </p>

      <div className="mt-6">
        <ListSearchForm
          action="/admin/enrollments"
          query={q}
          placeholder="Search by student name, email, or course"
          preserveParams={{
            paidPage: params.paidPage,
          }}
          totalCount={
            q ? freeTotalCount + paidTotalCount : undefined
          }
        />
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold text-foreground">
          Free enrollment requests
          {freeTotalCount > 0 && (
            <span className="ml-2 inline-flex rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning-text">
              {freeTotalCount}
            </span>
          )}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Courses with no enrollment fee. Approve to grant access immediately.
        </p>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <EnrollmentRequestsTable
            enrollments={freeEnrollmentRequests}
            courseTitleById={titleById}
            emptyMessage={
              q
                ? "No free enrollment requests match your search."
                : "No free enrollment requests awaiting approval."
            }
            showApprove
          />
        </div>

        <Pagination
          basePath="/admin/enrollments"
          params={params}
          page={safeFreePage}
          totalCount={freeTotalCount}
          pageSize={pageSize}
        />
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-serif text-lg font-semibold text-foreground">
              Paid courses — awaiting enrollment fee
              {paidTotalCount > 0 && (
                <span className="ml-2 inline-flex rounded-full bg-warning-bg px-2.5 py-0.5 text-xs font-semibold text-warning-text">
                  {paidTotalCount}
                </span>
              )}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Students must pay the enrollment fee first. Once they submit payment, verify it under
              enrollment fee approvals — approving payment activates the enrollment automatically.
            </p>
          </div>
          <Link
            href="/admin/payments#enrollment-fees"
            className="inline-flex shrink-0 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
          >
            Go to enrollment fee approvals
          </Link>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
          <EnrollmentRequestsTable
            enrollments={awaitingEnrollmentFee}
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

        <Pagination
          basePath="/admin/enrollments"
          params={params}
          page={safePaidPage}
          totalCount={paidTotalCount}
          pageSize={paidPageSize}
          pageParam="paidPage"
        />
      </section>

      <section className="mt-10">
        <AdminEnrollUserForm courses={enrollableCourses} />
      </section>
    </div>
  );
}
