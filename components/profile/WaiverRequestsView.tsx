"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Ticket, CheckCircle2, Clock, XCircle } from "lucide-react";
import { WaiverRequestModal } from "./WaiverRequestModal";

type CouponRequestItem = {
  id: string;
  createdAt: Date;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  course: { title: string };
  coupon: { code: string; percentage: number } | null;
};

type WaiverRequestsViewProps = {
  courses: { id: string; title: string }[];
  requests: CouponRequestItem[];
  initialCourseId?: string;
  initialType?: string;
};

export function WaiverRequestsView({
  courses,
  requests,
  initialCourseId,
  initialType,
}: WaiverRequestsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(
    Boolean(initialCourseId || initialType)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-2xl font-bold text-primary">Fee Waiver Requests</h1>
        <p className="mt-1 text-sm text-muted">Track and manage your fee waiver requests.</p>
      </div>

      {/* Modal */}
      <WaiverRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courses={courses}
        defaultCourseId={initialCourseId}
        defaultType={initialType}
      />

      {/* Requests History Table */}
      {requests.length === 0 ? (
        <div className="mt-6 rounded-lg border border-border bg-surface p-8 sm:p-12 text-center max-w-xl mx-auto shadow-sm space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted text-primary border border-border/50">
            <Ticket className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-serif text-lg font-bold text-foreground">No Fee Waiver Requests</h3>
            <p className="mt-2 text-sm text-muted leading-relaxed max-w-md mx-auto">
              When you submit a fee waiver request during course enrollment or payment, your submitted requests and approved coupon status will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="font-serif text-lg font-semibold text-foreground">Past Requests</h2>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
            <table className="w-full min-w-ui-640 text-left text-sm">
              <thead className="border-b border-border bg-background/60 text-muted uppercase text-[11px] tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Course</th>
                  <th className="px-5 py-3.5">Fee Type</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Assigned Coupon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-background/40 transition-colors">
                    <td className="px-5 py-4 text-muted whitespace-nowrap">
                      {format(new Date(r.createdAt), "dd MMM yyyy")}
                    </td>
                    <td className="px-5 py-4 text-foreground font-medium">
                      {r.course.title}
                    </td>
                    <td className="px-5 py-4 text-muted whitespace-nowrap">
                      {r.reason.includes("[Fee Type: Enrollment Fee]")
                        ? "Enrollment Fee"
                        : r.reason.includes("[Fee Type: Course Fee]")
                        ? "Course Fee"
                        : "Both"}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                          r.status === "PENDING"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : r.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-red-50 text-red-700 border border-red-200"
                        }`}
                      >
                        {r.status === "APPROVED" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {r.status === "PENDING" && <Clock className="h-3.5 w-3.5" />}
                        {r.status === "REJECTED" && <XCircle className="h-3.5 w-3.5" />}
                        {r.status === "APPROVED" ? "Approved" : r.status === "PENDING" ? "Pending Review" : "Rejected"}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {r.coupon ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono bg-background px-2.5 py-1 rounded border border-border text-xs font-bold text-foreground select-all">
                            {r.coupon.code}
                          </span>
                          <span className="text-emerald-600 font-bold text-xs">
                            ({r.coupon.percentage}% OFF)
                          </span>
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
