"use client";

import { format } from "date-fns";
import { deleteCoupon } from "@/app/admin/coupons/actions";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { EditCouponDialog } from "@/components/admin/EditCouponDialog";
import { adminDestructiveButtonClassName } from "@/utils/form";

type CourseOption = {
  id: string;
  title: string;
};

export type AdminCouponItem = {
  id: string;
  code: string;
  type: "DEFAULT" | "SPECIAL";
  percentage: number;
  createdAt?: Date | string | null;
  validUntil: Date | string;
  gender?: string | null;
  applyToEnrollment: boolean;
  applyToCourse: boolean;
  course?: { title: string } | null;
  user?: { name: string | null; email: string } | null;
};

function CouponSectionTable({
  title,
  description,
  coupons,
  courses,
  emptyMessage,
}: {
  title: string;
  description: string;
  coupons: AdminCouponItem[];
  courses: CourseOption[];
  emptyMessage: string;
}) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-serif text-base font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted">{description}</p>
      </div>

      {coupons.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          {emptyMessage}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Discount</th>
                <th className="px-4 py-3 font-medium">Created At</th>
                <th className="px-4 py-3 font-medium">Valid Until</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{c.code}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.type === "DEFAULT"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-purple-50 text-purple-700 border border-purple-200"
                      }`}
                    >
                      {c.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">{c.percentage}% OFF</td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {c.createdAt ? format(new Date(c.createdAt), "dd MMM, yyyy") : "N/A"}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {format(new Date(c.validUntil), "dd MMM, yyyy")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {c.course?.title || "All Courses"}
                    </div>
                    {c.gender && (
                      <div className="text-xs text-muted">Gender: {c.gender}</div>
                    )}
                    {c.user && (
                      <div className="text-xs text-muted">For: {c.user.name} ({c.user.email})</div>
                    )}
                    <div className="text-xs font-medium text-primary mt-1">
                      Applies to: {c.applyToEnrollment && c.applyToCourse ? "Both Fees" : c.applyToEnrollment ? "Enrollment Only" : "Course Only"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <EditCouponDialog coupon={c} courses={courses} />
                      <DeleteActionButton
                        action={deleteCoupon.bind(null, c.id)}
                        itemName={c.code}
                        className={adminDestructiveButtonClassName}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminCouponsTable({
  coupons,
  courses = [],
  type,
}: {
  coupons: AdminCouponItem[];
  courses?: CourseOption[];
  type?: "SPECIAL" | "DEFAULT";
}) {
  const specialCoupons = coupons.filter((c) => c.type === "SPECIAL");
  const defaultCoupons = coupons.filter((c) => c.type !== "SPECIAL");

  if (type === "SPECIAL") {
    return (
      <CouponSectionTable
        title="Special Coupons"
        description="Coupons generated for specific students or approved fee waiver requests."
        coupons={specialCoupons}
        courses={courses}
        emptyMessage="No special coupons created yet."
      />
    );
  }

  if (type === "DEFAULT") {
    return (
      <CouponSectionTable
        title="Default Coupons"
        description="General promotional coupons available to public or specific course/gender groups."
        coupons={defaultCoupons}
        courses={courses}
        emptyMessage="No default coupons created yet."
      />
    );
  }

  return (
    <div className="space-y-8">
      <CouponSectionTable
        title="Special Coupons"
        description="Coupons generated for specific students or approved fee waiver requests."
        coupons={specialCoupons}
        courses={courses}
        emptyMessage="No special coupons created yet."
      />

      <CouponSectionTable
        title="Default Coupons"
        description="General promotional coupons available to public or specific course/gender groups."
        coupons={defaultCoupons}
        courses={courses}
        emptyMessage="No default coupons created yet."
      />
    </div>
  );
}
