"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { createDefaultCoupon } from "@/app/admin/coupons/actions";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { inputClassName, labelClassName } from "@/utils/form";

type CourseOption = {
  id: string;
  title: string;
};

export function CreateCouponDialog({ courses }: { courses: CourseOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

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
    const result = await createDefaultCoupon(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-light transition-colors"
      >
        + Create Default Coupon
      </button>

      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left"
      >
        <h3 className="text-lg font-serif font-bold text-foreground mb-4">
          Create Default Coupon
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
                defaultValue={format(new Date(), "yyyy-MM-dd")}
                className={inputClassName}
              />
            </div>
            <div>
              <label className={labelClassName}>Valid Until</label>
              <input
                required
                type="date"
                name="validUntil"
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label className={labelClassName}>Course (Optional)</label>
            <select name="courseId" className={inputClassName}>
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
            <select name="gender" className={inputClassName}>
              <option value="">All Genders</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          <input type="hidden" name="isActive" value="true" />

          <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-border px-5 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted transition-colors"
            >
              Cancel
            </button>
            <SubmitButton className="rounded-full bg-primary px-5 py-2 text-xs font-semibold text-white hover:bg-primary-light transition-colors">
              Create Coupon
            </SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}
