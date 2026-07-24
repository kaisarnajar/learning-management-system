"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitWaiverRequest } from "@/app/actions/waiver";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { useToast } from "@/components/shared/ToastProvider";
import { inputClassName, labelClassName } from "@/utils/form";

type CourseOption = {
  id: string;
  title: string;
};

export function WaiverRequestModal({
  isOpen,
  onClose,
  courses,
  defaultCourseId,
  defaultType,
}: {
  isOpen: boolean;
  onClose: () => void;
  courses: CourseOption[];
  defaultCourseId?: string;
  defaultType?: string;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { addToast } = useToast();
  const [error, setError] = useState("");
  const [reasonCategory, setReasonCategory] = useState("Financial hardship");
  const [customReason, setCustomReason] = useState("");

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
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  if (!isOpen) return null;

  async function action(formData: FormData) {
    setError("");
    const feeTypeToSubmit = defaultType || (formData.get("feeType") as string);
    const category = formData.get("reasonCategory") as string;
    const customReasonInput = formData.get("customReason") as string;

    let finalReason = `[Fee Type: ${feeTypeToSubmit === "enrollment" ? "Enrollment Fee" : "Course Fee"}] Reason: ${category}`;
    if (category === "Other" && customReasonInput) {
      finalReason += ` - ${customReasonInput.trim()}`;
    }

    formData.set("reason", finalReason);

    const result = await submitWaiverRequest(formData);

    if (result?.error) {
      setError(result.error);
      addToast(result.error, "error");
    } else {
      onClose();
      addToast("Your fee waiver request has been submitted successfully!", "success");
      router.refresh();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="backdrop:bg-black/50 backdrop:backdrop-blur-sm fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-md p-6 bg-surface rounded-xl shadow-xl border border-border open:animate-in open:fade-in-90 open:zoom-in-95 m-0 overflow-hidden text-left"
    >
      <h3 className="font-serif text-lg font-bold text-foreground mb-1">
        Request Fee Waiver
      </h3>
      <p className="text-xs text-muted mb-4 leading-relaxed">
        If you are unable to pay the course fees, you can request a fee waiver here. The administration will review your request and may provide you with a special coupon code.
      </p>

      <form action={action} className="space-y-4">
        {error && (
          <p className="rounded-lg border border-red-200 bg-destructive-bg px-4 py-3 text-xs text-destructive-text">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="courseId" className={labelClassName}>
            Course
          </label>
          {defaultCourseId && (
            <input type="hidden" name="courseId" value={defaultCourseId} />
          )}
          <select
            id="courseId"
            name={defaultCourseId ? undefined : "courseId"}
            required
            defaultValue={defaultCourseId || ""}
            disabled={!!defaultCourseId}
            className={`${inputClassName} ${defaultCourseId ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            <option value="" disabled>Select a course...</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="feeType" className={labelClassName}>
            Fee Type
          </label>
          {defaultType && (
            <input type="hidden" name="feeType" value={defaultType} />
          )}
          <select
            id="feeType"
            name={defaultType ? undefined : "feeType"}
            required
            defaultValue={defaultType || "course"}
            disabled={!!defaultType}
            className={`${inputClassName} ${defaultType ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            <option value="enrollment">Enrollment Fee</option>
            <option value="course">Course Fee</option>
          </select>
        </div>

        <div>
          <label htmlFor="reasonCategory" className={labelClassName}>
            Reason for Waiver
          </label>
          <select
            id="reasonCategory"
            name="reasonCategory"
            required
            value={reasonCategory}
            onChange={(e) => setReasonCategory(e.target.value)}
            className={inputClassName}
          >
            <option value="Financial hardship">Financial hardship</option>
            <option value="Student / Unemployed">Student / Unemployed</option>
            <option value="Single parent / Primary caregiver">Single parent / Primary caregiver</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {reasonCategory === "Other" && (
          <div>
            <label htmlFor="customReason" className={labelClassName}>
              Please specify
            </label>
            <textarea
              id="customReason"
              name="customReason"
              required
              rows={3}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className={inputClassName}
              placeholder="Write your reason here..."
            />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent-muted/50 transition-colors"
          >
            Cancel
          </button>
          <SubmitButton className="min-h-10 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors">
            Submit Request
          </SubmitButton>
        </div>
      </form>
    </dialog>
  );
}
