import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { AdminCouponsTable } from "@/components/admin/AdminCouponsTable";
import { AdminCouponRequestsTable } from "@/components/admin/AdminCouponRequestsTable";
import { CreateCouponDialog } from "@/components/admin/CreateCouponDialog";
import Link from "next/link";

export const metadata = {
  title: "Fee Waivers & Coupons | Admin | Darse Quran Academy",
};

type SearchParams = {
  tab?: string;
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

  const coupons = await prisma.coupon.findMany({
    include: {
      course: { select: { title: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const requests = await prisma.couponRequest.findMany({
    include: {
      user: { select: { name: true, email: true, whatsapp: true } },
      course: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-primary">Fee Waivers & Coupons</h1>
          <p className="mt-1 text-sm text-muted">Manage default discount coupons and special student waiver requests.</p>
        </div>
        <CreateCouponDialog courses={courses} />
      </div>

      {/* Tab Navigation */}
      <nav className="flex flex-wrap gap-2" aria-label="Fee waivers navigation">
        <TabLink value="requests" label="Waiver Requests (Special)" active={activeTab === "requests"} />
        <TabLink value="coupons" label="All Coupons" active={activeTab === "coupons"} />
      </nav>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "requests" ? (
          <section>
            <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Waiver Requests (Special)</h2>
            <AdminCouponRequestsTable requests={requests} />
          </section>
        ) : (
          <section>
            <h2 className="font-serif text-lg font-semibold text-foreground mb-4">All Coupons</h2>
            <AdminCouponsTable coupons={coupons} courses={courses} />
          </section>
        )}
      </div>
    </div>
  );
}
