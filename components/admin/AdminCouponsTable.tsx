"use client";

import { format } from "date-fns";
import { toggleCouponActive } from "@/app/admin/coupons/actions";
import { useTransition } from "react";

export function AdminCouponsTable({ coupons }: { coupons: any[] }) {
  const [isPending, startTransition] = useTransition();

  if (coupons.length === 0) {
    return <p className="text-gray-500 text-sm">No coupons created yet.</p>;
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(() => {
      toggleCouponActive(id, !current);
    });
  }

  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="px-4 py-3">Code</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Discount</th>
            <th className="px-4 py-3">Valid Until</th>
            <th className="px-4 py-3">Target</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-white">
          {coupons.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-3 font-semibold">{c.code}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-1 rounded text-xs ${c.type === 'DEFAULT' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                  {c.type}
                </span>
              </td>
              <td className="px-4 py-3">{c.percentage}%</td>
              <td className="px-4 py-3">{format(new Date(c.validUntil), "PP")}</td>
              <td className="px-4 py-3">
                {c.course?.title || "All Courses"}<br/>
                {c.gender ? <span className="text-xs text-gray-500">({c.gender})</span> : null}
                {c.user ? <span className="text-xs text-gray-500">For: {c.user.name}</span> : null}
              </td>
              <td className="px-4 py-3">
                {c.isActive ? (
                  <span className="text-green-600 font-medium">Active</span>
                ) : (
                  <span className="text-red-600 font-medium">Inactive</span>
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  disabled={isPending}
                  onClick={() => handleToggle(c.id, c.isActive)}
                  className="text-primary hover:underline disabled:opacity-50"
                >
                  {c.isActive ? "Deactivate" : "Activate"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
