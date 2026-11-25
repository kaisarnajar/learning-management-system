import { requireAdmin } from "@/services/auth-actions";
import { getAdminCouponsPaginated, getCouponCourseOptions, getWaiverRequestsPaginated } from "@/services/coupons-admin";
import { AdminCouponsTable } from "@/components/admin/AdminCouponsTable";
import { AdminCouponRequestsTable } from "@/components/admin/AdminCouponRequestsTable";
import { CreateCouponDialog } from "@/components/admin/CreateCouponDialog";
import Link from "next/link";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, parsePaginationParams } from "@/utils/pagination";

export const metadata = {
  title: "Fee Waivers & Coupons | Admin",
};

type SearchParams = {
  tab?: string;
  page?: string;
};

function TabLink({
  value,
  label,
  active,
}: {
  value: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={`/admin/coupons?tab=${value}`}
      className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-white"
          : "bg-surface text-foreground hover:bg-accent-muted/50 border border-border"
      }`}
      aria-current={active ? "page" : undefined}
    >
      {label}
    </Link>
  );
}

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const activeTab = params.tab || "requests";

  // Coupons are paginated per tab (special / default) instead of loading every row.
  const couponType = activeTab === "special" ? "SPECIAL" : "DEFAULT";
  const { page: requestedPage, pageSize } = parsePaginationParams(params);
  const couponResult = activeTab === "requests"
    ? { items: [], totalCount: 0, page: 1 }
    : await getAdminCouponsPaginated(couponType, requestedPage, pageSize);
  const coupons = couponResult.items;
  const couponTotal = couponResult.totalCount;
  const couponPage = couponResult.page;

  const requestResult = activeTab !== "requests"
    ? { items: [], totalCount: 0 }
    : await getWaiverRequestsPaginated(requestedPage, pageSize);

  const courses = await getCouponCourseOptions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary">Fee Waivers & Coupons</h1>
        <p className="mt-1 text-sm text-muted">Manage default discount coupons and special student waiver requests.</p>
      </div>

      {/* Tab Navigation */}
      <nav className="flex flex-wrap gap-2" aria-label="Fee waivers navigation">
        <TabLink value="requests" label="Waiver Requests" active={activeTab === "requests"} />
        <TabLink value="special" label="Special Coupons" active={activeTab === "special"} />
        <TabLink value="default" label="Default Coupons" active={activeTab === "default" || activeTab === "coupons"} />
      </nav>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "requests" && (
          <section>
            <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Waiver Requests</h2>
            <AdminCouponRequestsTable requests={requestResult.items} />
            <Pagination basePath="/admin/coupons" params={params} page={clampPage(requestedPage, requestResult.totalCount, pageSize)} totalCount={requestResult.totalCount} pageSize={pageSize} />
          </section>
        )}
        {activeTab === "special" && (
          <section>
            <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Special Coupons</h2>
            <AdminCouponsTable coupons={coupons} courses={courses} type="SPECIAL" />
            <Pagination basePath="/admin/coupons" params={params} page={couponPage} totalCount={couponTotal} pageSize={pageSize} />
          </section>
        )}
        {(activeTab === "default" || activeTab === "coupons") && (
          <section>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
              <h2 className="font-serif text-lg font-semibold text-foreground">Default Coupons</h2>
              <CreateCouponDialog courses={courses} />
            </div>
            <AdminCouponsTable coupons={coupons} courses={courses} type="DEFAULT" />
            <Pagination basePath="/admin/coupons" params={params} page={couponPage} totalCount={couponTotal} pageSize={pageSize} />
          </section>
        )}
      </div>
    </div>
  );
}
