"use client";

import { useState } from "react";
import { submitWaiverRequest } from "@/app/actions/waiver";
import { SubmitButton } from "@/components/shared/SubmitButton";
import { inputClassName, labelClassName } from "@/utils/form";

export function WaiverRequestForm({
  courses,
  defaultCourseId,
  defaultType,
}: {
  courses: { id: string; title: string }[];
  defaultCourseId?: string;
  defaultType?: string;
}) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [reasonCategory, setReasonCategory] = useState("Financial hardship");

  async function action(formData: FormData) {
    setError("");
    setSuccess(false);

    const feeType = formData.get("feeType") as string;
    const category = formData.get("reasonCategory") as string;
    const customReason = formData.get("customReason") as string;
    
    let finalReason = `[Fee Type: ${feeType === "enrollment" ? "Enrollment Fee" : "Course Fee"}] Reason: ${category}`;
    if (category === "Other" && customReason) {
      finalReason += ` - ${customReason}`;
    }

    formData.set("reason", finalReason);

    const result = await submitWaiverRequest(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      (document.getElementById("waiver-form") as HTMLFormElement).reset();
      setReasonCategory("Financial hardship");
    }
  }

  return (
    <form
      id="waiver-form"
      action={action}
      className="card-elevated w-full space-y-8 p-6 sm:p-8"
    >
      <div>
        <h2 className="font-serif text-xl font-semibold text-foreground">Request Fee Waiver</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          If you are unable to pay the course fees, you can request a fee waiver here.
          The administration will review your request and may provide you with a special coupon code.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}
      
      {success && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Your request has been submitted successfully! The administration will review it shortly.
        </p>
      )}

      <div className="space-y-4">
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
            defaultValue={defaultCourseId}
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
            defaultValue={defaultType || ""}
            disabled={!!defaultType}
            className={`${inputClassName} ${defaultType ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            <option value="" disabled>Select fee type...</option>
            <option value="enrollment">Enrollment Fee</option>
            <option value="course">Course Fee</option>
          </select>
        </div>
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
            className={inputClassName}
            placeholder="Write your reason here..."
          />
        </div>
      )}

      <div className="border-t border-border pt-6 flex sm:justify-start">
        <SubmitButton
          type="submit"
          className="min-h-11 rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
        >
          Submit Request
        </SubmitButton>
      </div>
    </form>
  );
}
