"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { updateCoupon } from "@/app/admin/coupons/actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { useToast } from "@/components/shared/ToastProvider";
import { adminActionButtonClassName, inputClassName, labelClassName } from "@/utils/form";

type CourseOption = {
  id: string;
  title: string;
};

export function EditCouponDialog({
  coupon,
  courses,
}: {
  coupon: any;
  courses: CourseOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { addToast } = useToast();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen && dialog && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      setIsOpen(false);
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, []);

  async function action(formData: FormData) {
    setError("");
    const result = await updateCoupon(coupon.id, formData);
    if (result?.error) {
      setError(result.error);
      addToast(result.error, "error");
    } else {
      setIsOpen(false);
      addToast("Coupon updated successfully.", "success");
    }
  }

  const defaultFrom = coupon.validFrom
    ? format(new Date(coupon.validFrom), "yyyy-MM-dd")
    : format(new Date(), "yyyy-MM-dd");

  const defaultUntil = coupon.validUntil
    ? format(new Date(coupon.validUntil), "yyyy-MM-dd")
    : "";

  const defaultApplyTo =
    coupon.applyToEnrollment && coupon.applyToCourse
      ? "BOTH"
      : coupon.applyToEnrollment
      ? "ENROLLMENT"
      : "COURSE";

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={adminActionButtonClassName}
        type="button"
      >
        Edit
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left"
      >
        <h3 className="font-serif text-lg font-bold text-foreground mb-4">
          Edit Coupon: {coupon.code}
        </h3>

        <form action={action} className="space-y-4">
          {error && (
            <p className="rounded-lg border border-red-200 bg-destructive-bg px-4 py-3 text-xs text-destructive-text">
              {error}
            </p>
          )}

          <div>
            <label className={labelClassName}>Code</label>
            <input
              required
              type="text"
              name="code"
              defaultValue={coupon.code}
              className={inputClassName}
              placeholder="e.g. SUMMER50"
            />
          </div>

          <div>
            <label className={labelClassName}>Discount Percentage (%)</label>
            <input
              required
              type="number"
              min="1"
              max="100"
              name="percentage"
              defaultValue={coupon.percentage}
              className={inputClassName}
              placeholder="50"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClassName}>Valid From</label>
              <input
                required
                type="date"
                name="validFrom"
                defaultValue={defaultFrom}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Valid Until</label>
              <input
                required
                type="date"
                name="validUntil"
                defaultValue={defaultUntil}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName}>Course (Optional)</label>
            <select name="courseId" defaultValue={coupon.courseId || ""} className={inputClassName}>
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClassName}>Gender (Optional)</label>
            <select name="gender" defaultValue={coupon.gender || ""} className={inputClassName}>
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          <div>
            <label className={labelClassName}>Applies to Fee Type</label>
            <select name="applyTo" className={inputClassName} defaultValue={defaultApplyTo}>
              <option value="BOTH">Both Enrollment & Course Fees</option>
              <option value="ENROLLMENT">Enrollment Fee Only</option>
              <option value="COURSE">Course Fee Only</option>
            </select>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="min-h-10 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent-muted/50 transition-colors"
            >
              Cancel
            </button>
            <SubmitButton className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors">
              Save Changes
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
