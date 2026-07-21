"use client";

import { format } from "date-fns";
import { useState, useTransition, useRef, useEffect } from "react";
import { approveCouponRequest, rejectCouponRequest } from "@/app/admin/coupons/actions";
import { SubmitButton } from "@/components/shared/SubmitButton";

export function AdminCouponRequestsTable({ requests }: { requests: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (selectedRequest && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!selectedRequest && dialog && dialog.open) {
      dialog.close();
    }
  }, [selectedRequest]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    
    const handleCancel = (e: Event) => {
      e.preventDefault();
      setSelectedRequest(null);
    };
    
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  if (requests.length === 0) {
    return <p className="text-gray-500 text-sm">No waiver requests found.</p>;
  }

  function handleReject(id: string) {
    if (confirm("Are you sure you want to reject this request?")) {
      startTransition(() => {
        rejectCouponRequest(id);
      });
    }
  }

  async function handleApprove(formData: FormData) {
    const id = formData.get("id") as string;
    const percentage = Number(formData.get("percentage"));
    const validUntil = formData.get("validUntil") as string;

    const res = await approveCouponRequest(id, percentage, validUntil);
    if (!res.error) {
      setSelectedRequest(null);
    } else {
      alert(res.error);
    }
  }

  return (
    <>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3 max-w-xs">Reason</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap">{format(new Date(r.createdAt), "dd MMM, yyyy")}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold">{r.user.name}</p>
                  <p className="text-xs text-gray-500">{r.user.email}</p>
                </td>
                <td className="px-4 py-3">{r.course.title}</td>
                <td className="px-4 py-3 max-w-xs whitespace-normal">{r.reason}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    r.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    r.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {r.status === "PENDING" && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedRequest(r)}
                        className="text-green-600 hover:underline"
                        disabled={isPending}
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(r.id)}
                        className="text-red-600 hover:underline"
                        disabled={isPending}
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog ref={dialogRef} className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Approve Fee Waiver
        </h3>
        
        <form action={handleApprove} className="space-y-4">
          <input type="hidden" name="id" value={selectedRequest?.id} />
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Discount Percentage (%)</label>
            <input required type="number" min="1" max="100" defaultValue="100" name="percentage" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
            <p className="text-xs text-gray-500 mt-1">Set to 100 for a full free course.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Valid Until</label>
            <input required type="date" name="validUntil" defaultValue={format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm" />
            <p className="text-xs text-gray-500 mt-1">How long the student has to use this coupon.</p>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setSelectedRequest(null)} className="rounded border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <SubmitButton className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Approve & Generate Coupon</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
