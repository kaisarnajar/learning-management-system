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

"use client";

import { format } from "date-fns";
import { useState, useTransition, useRef, useEffect } from "react";
import { approveCouponRequest, rejectCouponRequest } from "@/app/admin/coupons/actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { adminActionButtonClassName, adminDestructiveButtonClassName, inputClassName, labelClassName } from "@/utils/form";

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
    return (
      <div className="card-elevated p-8 text-center text-sm text-muted">
        No fee waiver requests found.
      </div>
    );
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
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface-muted/60 text-xs font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3.5">Date</th>
                <th className="px-5 py-3.5">Student</th>
                <th className="px-5 py-3.5">Course</th>
                <th className="px-5 py-3.5 max-w-xs">Reason</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-surface">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-surface-muted/30 transition-colors">
                  <td className="px-5 py-4 whitespace-nowrap text-muted font-medium">
                    {format(new Date(r.createdAt), "dd MMM, yyyy")}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-foreground">{r.user.name}</p>
                    <p className="text-xs text-muted">{r.user.email}</p>
                  </td>
                  <td className="px-5 py-4 font-medium text-foreground">{r.course.title}</td>
                  <td className="px-5 py-4 max-w-xs text-xs leading-relaxed text-muted font-mono">{r.reason}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === "PENDING"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : r.status === "APPROVED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    {r.status === "PENDING" && (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setSelectedRequest(r)}
                          className={adminActionButtonClassName}
                          disabled={isPending}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(r.id)}
                          className={adminDestructiveButtonClassName}
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
      </div>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left"
      >
        <h3 className="text-lg font-serif font-bold text-foreground mb-4">
          Approve Fee Waiver
        </h3>
        
        <form action={handleApprove} className="space-y-4">
          <input type="hidden" name="id" value={selectedRequest?.id || ""} />
          
          <div>
            <label className={labelClassName}>Discount Percentage (%)</label>
            <input
              required
              type="number"
              min="1"
              max="100"
              defaultValue="100"
              name="percentage"
              className={inputClassName}
            />
            <p className="text-xs text-muted mt-1">Set to 100 for a full free course/enrollment waiver.</p>
          </div>
          
          <div>
            <label className={labelClassName}>Valid Until</label>
            <input
              required
              type="date"
              name="validUntil"
              defaultValue={format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")}
              className={inputClassName}
            />
            <p className="text-xs text-muted mt-1">How long the student has to use this coupon.</p>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setSelectedRequest(null)}
              className="rounded-full border border-border px-5 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
            <SubmitButton className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-light transition-colors">
              Approve & Generate Coupon
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
