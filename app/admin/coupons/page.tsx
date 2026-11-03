import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { resolveWaiverFeeType, waiverFeeTypeLabel } from "@/services/waiver-requests";
import { AdminCouponsTable } from "@/components/admin/AdminCouponsTable";
import { AdminCouponRequestsTable } from "@/components/admin/AdminCouponRequestsTable";
import { CreateCouponDialog } from "@/components/admin/CreateCouponDialog";
import Link from "next/link";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, paginationArgs, parsePaginationParams } from "@/utils/pagination";

export const metadata = {
  title: "Fee Waivers & Coupons | Admin | Darse Quran Academy",
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
  const couponWhere = { type: couponType as "SPECIAL" | "DEFAULT" };
  const couponTotal = activeTab === "requests" ? 0 : await prisma.coupon.count({ where: couponWhere });
  const couponPage = clampPage(requestedPage, couponTotal, pageSize);
  const coupons = activeTab === "requests" ? [] : await prisma.coupon.findMany({
    where: couponWhere,
    include: {
      course: { select: { title: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    ...paginationArgs(couponPage, pageSize),
  });

  const requests = activeTab !== "requests" ? [] : (await prisma.couponRequest.findMany({
    include: {
      user: { select: { name: true, email: true, whatsapp: true } },
      course: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  })).map((request) => ({
    ...request,
    feeTypeLabel: waiverFeeTypeLabel(resolveWaiverFeeType(request)),
  }));

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

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
            <AdminCouponRequestsTable requests={requests} />
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
