import { requireAdmin } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { AdminCouponsTable } from "@/components/admin/AdminCouponsTable";
import { AdminCouponRequestsTable } from "@/components/admin/AdminCouponRequestsTable";
import { CreateCouponDialog } from "@/components/admin/CreateCouponDialog";

export const metadata = {
  title: "Fee Waivers & Coupons | Admin | Darse Quran Academy",
};

export default async function AdminCouponsPage() {
  await requireAdmin();

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Fee Waivers & Coupons</h1>
          <p className="text-sm text-muted">Manage default discount coupons and special student waiver requests.</p>
        </div>
        <CreateCouponDialog courses={courses} />
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-serif font-semibold text-foreground mb-4">Waiver Requests (Special)</h2>
          <AdminCouponRequestsTable requests={requests} />
        </section>

        <section>
          <h2 className="text-lg font-serif font-semibold text-foreground mb-4">All Coupons</h2>
          <AdminCouponsTable coupons={coupons} />
        </section>
      </div>
    </div>
  );
}
