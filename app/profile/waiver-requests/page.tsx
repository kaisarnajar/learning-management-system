import { requireUser } from "@/services/auth-actions";
import { prisma } from "@/utils/prisma";
import { WaiverRequestForm } from "@/components/profile/WaiverRequestForm";
import { format } from "date-fns";

export const metadata = {
  title: "Fee Waiver Requests | Darse Quran Academy",
};

export default async function WaiverRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; type?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;

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

  const defaultType = params.type === "enrollment" ? "enrollment" : params.type === "course" ? "course" : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Fee Waiver Requests</h1>
        <p className="text-sm text-muted">Submit and track your fee waiver requests.</p>
      </div>

      <WaiverRequestForm courses={courses} defaultCourseId={params.courseId} defaultType={defaultType} />

      {requests.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-semibold text-foreground mb-4">Past Requests</h2>
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-ui-640 text-left text-sm">
              <thead className="border-b border-border bg-background/50 text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 font-medium">Fee Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Assigned Coupon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-muted">{format(new Date(r.createdAt), "dd MMM yyyy")}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{r.course.title}</td>
                    <td className="px-4 py-3 text-muted">
                      {r.reason.includes("[Fee Type: Enrollment Fee]") ? "Enrollment Fee" : r.reason.includes("[Fee Type: Course Fee]") ? "Course Fee" : "Both"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === 'PENDING' ? 'bg-warning-bg text-warning-text' :
                        r.status === 'APPROVED' ? 'bg-success-bg text-success-text' :
                        'bg-destructive-bg text-destructive-text'
                      }`}>
                        {r.status === 'APPROVED' ? 'Approved' : r.status === 'PENDING' ? 'Pending' : 'Rejected'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {r.coupon ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-surface-muted px-2 py-0.5 rounded border border-border text-xs select-all">{r.coupon.code}</span>
                          <span className="text-emerald-600 font-semibold text-xs">({r.coupon.percentage}% OFF)</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
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
