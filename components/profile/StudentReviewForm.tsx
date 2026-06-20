"use client";

import { useCallback } from "react";
import type { StudentReview } from "@prisma/client";
import { StarRatingInput } from "@/components/reviews/StarRatingInput";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import {
  type StudentReviewFormValues,
  validateStudentReviewForm,
} from "@/lib/profile-form-validation";
import { useZodForm } from "@/lib/use-zod-form";

type StudentReviewFormProps = {
  action: (formData: FormData) => Promise<void>;
  review?: Pick<StudentReview, "id" | "quote" | "course" | "location" | "rating">;
  defaultLocation?: string | null;
  submitLabel?: string;
};

const STUDENT_REVIEW_FIELDS: (keyof StudentReviewFormValues)[] = [
  "rating",
  "quote",
  "course",
  "location",
];

export function StudentReviewForm({
  action,
  review,
  defaultLocation,
  submitLabel,
}: StudentReviewFormProps) {

  const validate = useCallback(
    (values: StudentReviewFormValues) => validateStudentReviewForm(values),
    [],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      quote: review?.quote ?? "",
      course: review?.course ?? "",
      location: review?.location ?? defaultLocation ?? "",
      rating: review?.rating ?? 0,
    },
    fields: STUDENT_REVIEW_FIELDS,
    validate,
  });

  return (
    <form action={action} className="space-y-4 rounded-lg border border-border bg-surface p-5">
      <div>
        <StarRatingInput
          value={values.rating}
          onChange={(rating) => {
            updateField("rating", rating);
            markTouched("rating");
          }}
          onBlur={() => markTouched("rating")}
          hasError={showError("rating")}
        />
        {showError("rating") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.rating}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="quote" className={labelClassName}>
          Your review <span className="text-destructive-text">*</span>
        </label>
        <textarea
          id="quote"
          name="quote"
          required
          rows={5}
          maxLength={1000}
          value={values.quote}
          onChange={(e) => updateField("quote", e.target.value)}
          onBlur={() => markTouched("quote")}
          aria-invalid={showError("quote") || undefined}
          placeholder="Share your experience learning with Darse Quran Academy…"
          className={formFieldInputClass(showError("quote"))}
        />
        {showError("quote") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.quote}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="course" className={labelClassName}>
            Course (optional)
          </label>
          <input
            id="course"
            name="course"
            maxLength={120}
            value={values.course}
            onChange={(e) => updateField("course", e.target.value)}
            onBlur={() => markTouched("course")}
            aria-invalid={showError("course") || undefined}
            placeholder="e.g. Tajweed, Hifz"
            className={formFieldInputClass(showError("course"))}
          />
          {showError("course") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.course}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="location" className={labelClassName}>
            Location (optional)
          </label>
          <input
            id="location"
            name="location"
            maxLength={120}
            value={values.location}
            onChange={(e) => updateField("location", e.target.value)}
            onBlur={() => markTouched("location")}
            aria-invalid={showError("location") || undefined}
            placeholder="e.g. Srinagar, J&K"
            className={formFieldInputClass(showError("location"))}
          />
          {showError("location") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.location}
            </p>
          )}
        </div>
      </div>

      <p className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning-text">
        Your review will be sent to the admin for verification. If approved, it may appear on the
        homepage (up to six student reviews are shown at a time).
      </p>

      <button
        type="submit"
        disabled={!isValid}
        className="min-h-11 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitLabel ?? (review ? "Resubmit for approval" : "Submit review")}
      </button>
    </form>
  );
}
