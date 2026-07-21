import { requireAuth } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { WaiverRequestForm } from "@/components/profile/WaiverRequestForm";
import { format } from "date-fns";

export const metadata = {
  title: "Fee Waiver Requests | Darse Quran Academy",
};

export default async function WaiverRequestsPage() {
  const session = await requireAuth();

  const courses = await prisma.course.findMany({
    select: { id: true, title: true },
    orderBy: { title: "asc" },
  });

  const requests = await prisma.couponRequest.findMany({
    where: { userId: session.user.id },
    include: {
      course: { select: { title: true } },
      coupon: { select: { code: true, percentage: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Fee Waiver Requests</h1>
        <p className="text-sm text-muted">Submit and track your fee waiver requests.</p>
      </div>

      <WaiverRequestForm courses={courses} />

      {requests.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-serif font-semibold text-foreground">Past Requests</h2>
          <div className="overflow-hidden rounded-lg border border-border bg-white shadow-sm">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/30">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Course</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Assigned Coupon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-white">
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">{format(new Date(r.createdAt), "dd MMM yyyy")}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">{r.course.title}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        r.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-foreground">
                      {r.coupon ? (
                        <div>
                          <span className="font-mono bg-gray-100 px-2 py-1 rounded border border-gray-200 select-all">{r.coupon.code}</span>
                          <span className="ml-2 text-green-600 font-medium">({r.coupon.percentage}% OFF)</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
