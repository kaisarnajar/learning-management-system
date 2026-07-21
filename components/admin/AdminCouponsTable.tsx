"use client";

import { format } from "date-fns";
import { toggleCouponActive } from "@/app/admin/coupons/actions";
import { useTransition } from "react";
import { adminActionButtonClassName, adminDestructiveButtonClassName } from "@/utils/form";

export function AdminCouponsTable({ coupons }: { coupons: any[] }) {
  const [isPending, startTransition] = useTransition();

  if (coupons.length === 0) {
    return (
      <div className="card-elevated p-8 text-center text-sm text-muted">
        No coupons created yet.
      </div>
    );
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(() => {
      toggleCouponActive(id, !current);
    });
  }

  return (
    <div className="card-elevated overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th className="px-5 py-3.5">Code</th>
              <th className="px-5 py-3.5">Type</th>
              <th className="px-5 py-3.5">Discount</th>
              <th className="px-5 py-3.5">Valid Until</th>
              <th className="px-5 py-3.5">Target</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-surface">
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-surface-muted/30 transition-colors">
                <td className="px-5 py-4 font-mono font-bold text-foreground">{c.code}</td>
                <td className="px-5 py-4">
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
                <td className="px-5 py-4 font-medium text-foreground">{c.percentage}% OFF</td>
                <td className="px-5 py-4 text-muted whitespace-nowrap">
                  {format(new Date(c.validUntil), "dd MMM, yyyy")}
                </td>
                <td className="px-5 py-4">
                  <div className="font-medium text-foreground">
                    {c.course?.title || "All Courses"}
                  </div>
                  {c.gender && (
                    <div className="text-xs text-muted">Gender: {c.gender}</div>
                  )}
                  {c.user && (
                    <div className="text-xs text-muted">For: {c.user.name} ({c.user.email})</div>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {c.isActive ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-right whitespace-nowrap">
                  <button
                    disabled={isPending}
                    onClick={() => handleToggle(c.id, c.isActive)}
                    className={c.isActive ? adminDestructiveButtonClassName : adminActionButtonClassName}
                  >
                    {c.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
