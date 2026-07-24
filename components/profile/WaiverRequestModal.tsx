"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Ticket } from "lucide-react";
import { submitWaiverRequest } from "@/app/actions/waiver";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { useToast } from "@/components/shared/ToastProvider";
import { inputClassName, labelClassName } from "@/utils/form";

type WaiverRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  courses: { id: string; title: string }[];
  defaultCourseId?: string;
  defaultType?: string;
};

export function WaiverRequestModal({
  isOpen,
  onClose,
  courses,
  defaultCourseId,
  defaultType,
}: WaiverRequestModalProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(defaultCourseId || "");
  const [selectedFeeType, setSelectedFeeType] = useState(defaultType || "course");
  const [reasonCategory, setReasonCategory] = useState("Financial hardship");
  const [customReason, setCustomReason] = useState("");

  useEffect(() => {
    if (defaultCourseId) setSelectedCourseId(defaultCourseId);
    if (defaultType) setSelectedFeeType(defaultType);
  }, [defaultCourseId, defaultType]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);

    try {
      const courseIdToSubmit = defaultCourseId || selectedCourseId;
      const feeTypeToSubmit = defaultType || selectedFeeType;

      if (!courseIdToSubmit) {
        setError("Please select a course.");
        setLoading(false);
        return;
      }

      let finalReason = `[Fee Type: ${feeTypeToSubmit === "enrollment" ? "Enrollment Fee" : "Course Fee"}] Reason: ${reasonCategory}`;
      if (reasonCategory === "Other" && customReason.trim()) {
        finalReason += ` - ${customReason.trim()}`;
      }

      const formData = new FormData();
      formData.append("courseId", courseIdToSubmit);
      formData.append("reason", finalReason);

      const result = await submitWaiverRequest(formData);

      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      addToast("Your fee waiver request has been submitted successfully! The administration will review it shortly.", "success");
      setLoading(false);
      onClose();
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl z-10 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-background/50">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Ticket className="h-5 w-5" />
            </div>
            <h3 className="font-serif text-lg font-bold text-foreground">Request Fee Waiver</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted hover:bg-accent-muted hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-xs text-muted leading-relaxed">
            If you are unable to pay the course fees, you can request a fee waiver here. The administration will review your request and may provide you with a special coupon code.
          </p>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive-bg px-4 py-3 text-xs font-medium text-destructive-text" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="modalCourseId" className={labelClassName}>
                Course
              </label>
              <select
                id="modalCourseId"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                required
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
              <label htmlFor="modalFeeType" className={labelClassName}>
                Fee Type
              </label>
              <select
                id="modalFeeType"
                value={selectedFeeType}
                onChange={(e) => setSelectedFeeType(e.target.value)}
                required
                disabled={!!defaultType}
                className={`${inputClassName} ${defaultType ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                <option value="enrollment">Enrollment Fee</option>
                <option value="course">Course Fee</option>
              </select>
            </div>

            <div>
              <label htmlFor="modalReasonCategory" className={labelClassName}>
                Reason for Waiver
              </label>
              <select
                id="modalReasonCategory"
                value={reasonCategory}
                onChange={(e) => setReasonCategory(e.target.value)}
                required
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
                <label htmlFor="modalCustomReason" className={labelClassName}>
                  Please specify
                </label>
                <textarea
                  id="modalCustomReason"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  required
                  rows={3}
                  className={inputClassName}
                  placeholder="Write your reason here..."
                />
              </div>
            )}
          </div>

          <div className="border-t border-border pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2 text-xs font-semibold text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <SubmitButton
              isSubmitting={loading}
              type="submit"
              disabled={loading}
              className="min-h-10 rounded-full bg-primary px-6 py-2 text-xs font-semibold text-white hover:bg-primary-light transition-colors disabled:opacity-60"
            >
              {loading ? "Submitting…" : "Submit Request"}
            </SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
