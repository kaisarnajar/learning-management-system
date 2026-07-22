"use client";

import { format } from "date-fns";
import { useState, useTransition, useRef, useEffect } from "react";
import { approveCouponRequest, rejectCouponRequest } from "@/app/admin/coupons/actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";
import { adminActionButtonClassName, adminDestructiveButtonClassName, inputClassName, labelClassName } from "@/utils/form";

export function AdminCouponRequestsTable({ requests }: { requests: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { addToast } = useToast();

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
      <div className="mt-4 rounded-lg border border-border bg-surface px-4 py-8 text-center text-sm text-muted">
        No fee waiver requests found.
      </div>
    );
  }

  async function handleApprove(formData: FormData) {
    const id = formData.get("id") as string;
    const percentage = Number(formData.get("percentage"));
    const validUntil = formData.get("validUntil") as string;

    const res = await approveCouponRequest(id, percentage, validUntil);
    if (res?.success) {
      setSelectedRequest(null);
      addToast("Fee waiver request approved and coupon created.", "success");
    } else if (res?.error) {
      addToast(res.error, "error");
    }
  }

  return (
    <>
      <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-background/50 text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Student</th>
              <th className="px-4 py-3 font-medium">Course</th>
              <th className="px-4 py-3 font-medium max-w-xs">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 whitespace-nowrap text-muted font-medium">
                  {format(new Date(r.createdAt), "dd MMM, yyyy")}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{r.user.name}</p>
                  <p className="text-xs text-muted">{r.user.email}</p>
                </td>
                <td className="px-4 py-3 font-medium text-foreground">{r.course.title}</td>
                <td className="px-4 py-3 max-w-xs text-xs leading-relaxed text-muted font-mono">{r.reason}</td>
                <td className="px-4 py-3 whitespace-nowrap">
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
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.status === "PENDING" && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedRequest(r)}
                        className={adminActionButtonClassName}
                        disabled={isPending}
                      >
                        Approve
                      </button>
                      <ConfirmationModal
                        title="Reject Fee Waiver Request"
                        description="Are you sure you want to reject this request?"
                        actionLabel="Reject"
                        variant="destructive"
                        onConfirm={async () => {
                          const res = await rejectCouponRequest(r.id);
                          if (res?.error) {
                            addToast(res.error, "error");
                          } else {
                            addToast("Fee waiver request rejected.", "info");
                          }
                        }}
                        trigger={
                          <button
                            type="button"
                            className={adminDestructiveButtonClassName}
                            disabled={isPending}
                          >
                            Reject
                          </button>
                        }
                      />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left"
      >
        <h3 className="font-serif text-lg font-bold text-foreground mb-4">
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
              className="min-h-10 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent-muted/50 transition-colors"
            >
              Cancel
            </button>
            <SubmitButton className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors">
              Approve & Generate Coupon
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
