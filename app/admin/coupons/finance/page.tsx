import { format } from "date-fns";
import Link from "next/link";
import { FinanceDateFilter } from "@/components/admin/FinanceDateFilter";
import { FinanceIncomeFilters } from "@/components/admin/FinanceIncomeFilters";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { ReceiptActionButtons } from "@/components/payment/ReceiptActionButtons";
import { getAllCourses, formatPrice } from "@/services/courses";
import {
  buildFinanceSearchPreserveParams,
  parseFinanceFilters,
  type FinanceSearchParams,
} from "@/services/finance-filters";
import { getFeeWaiverFinanceData } from "@/services/waiver-finance";
import { getStudentUsers } from "@/services/students";
import { clampPage, parsePaginationParams } from "@/utils/pagination";

export const metadata = {
  title: "Fee Waiver Finance | Admin",
  description: "Financial analytics and calculation of total claimed fee waivers.",
};

export default async function FeeWaiverFinancePage({
  searchParams,
}: {
  searchParams: Promise<FinanceSearchParams>;
}) {
  const params = await searchParams;
  const filters = parseFinanceFilters(params);
  const { page: requestedPage, pageSize } = parsePaginationParams(params);

  const [
    courses,
    students,
    financeData,
  ] = await Promise.all([
    getAllCourses(),
    getStudentUsers(),
    getFeeWaiverFinanceData(filters, requestedPage, pageSize),
  ]);

  const { stats, paginatedResult } = financeData;
  const { items, totalCount } = paginatedResult;
  const safePage = clampPage(requestedPage, totalCount, pageSize);
  const searchPreserveParams = buildFinanceSearchPreserveParams(filters);

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Fee Waiver Finance</h1>
          <p className="mt-1 text-sm text-muted">
            Financial analytics and total claimed fee waivers across courses and students.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/coupons"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-accent-muted/50 transition-colors"
          >
            Requests & Coupons
          </Link>
        </div>
      </div>

      {/* ── Date Range Presets ──────────────────────────── */}
      <div className="mt-6">
        <FinanceDateFilter filters={filters} />
      </div>

      {/* ── Summary Statistics Cards ────────────────────── */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Waivers Claimed</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.totalWaiverCount}</p>
          <p className="mt-1 text-xs text-muted">Original total: {formatPrice(stats.totalOriginalFeePaise)}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Total Sum Waived Off</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{formatPrice(stats.totalSumWaivedPaise)}</p>
          <p className="mt-1 text-xs text-muted">Net collected: {formatPrice(stats.totalNetPaidPaise)}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">100% Full Waivers</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.fullWaiverCount}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Waived: {formatPrice(stats.fullWaiverSumPaise)}</p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Partial Waivers</p>
          <p className="mt-2 text-2xl font-bold text-foreground">{stats.partialWaiverCount}</p>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Waived: {formatPrice(stats.partialWaiverSumPaise)}</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ────────────────────── */}
      <div className="mt-8 space-y-4">
        <ListSearchForm
          action="/admin/coupons/finance"
          query={filters.q}
          placeholder="Search by student name, email, course, or label..."
          preserveParams={searchPreserveParams}
          totalCount={filters.q ? totalCount : undefined}
        />

        <FinanceIncomeFilters
          filters={filters}
          courses={courses.map((c) => ({ id: c.id, title: c.title }))}
          students={students.map((s) => ({ id: s.id, name: s.name, email: s.email }))}
        />

        {/* ── Claimed Fee Waivers Table ───────────────────── */}
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">
              No claimed fee waivers found for the selected filters.
            </p>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-border bg-background/50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Student</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Original Fee</th>
                  <th className="px-4 py-3 font-medium">Waived Off</th>
                  <th className="px-4 py-3 font-medium">Net Paid</th>
                  <th className="px-4 py-3 font-medium text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {format(new Date(item.date), "dd MMM, yyyy")}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.studentName}</p>
                      <p className="text-xs text-muted">{item.studentEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{item.courseTitle}</p>
                      <p className="text-xs text-muted capitalize">{item.paymentType} fee</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-muted">
                      {formatPrice(item.originalFeePaise)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-emerald-600">
                        -{formatPrice(item.waivedAmountPaise)}
                      </div>
                      <span className="inline-block mt-0.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200 uppercase">
                        {item.discountPercentage}% OFF
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      {formatPrice(item.netPaidPaise)}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {item.paymentRecordId ? (
                        <ReceiptActionButtons
                          paymentRecordId={item.paymentRecordId}
                          receiptGeneratedAt={item.receiptGeneratedAt}
                          isAdmin
                          label="View Receipt"
                        />
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Pagination
          basePath="/admin/coupons/finance"
          params={params}
          page={safePage}
          totalCount={totalCount}
          pageSize={pageSize}
        />
      </div>
    </div>
  );
}
