"use client";

import type { DailyInspirationKind } from "@prisma/client";
import { useCallback } from "react";
import {
  type DailyInspirationFormValues,
  validateDailyInspirationForm,
} from "@/lib/admin-form-validation";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import { useZodForm } from "@/lib/use-zod-form";

type DailyInspirationFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  item?: {
    kind: DailyInspirationKind;
    arabicText: string;
    englishTranslation: string;
    reference: string | null;
    published: boolean;
  };
  error?: string;
};

const DAILY_INSPIRATION_FIELDS: (keyof DailyInspirationFormValues)[] = [
  "kind",
  "arabicText",
  "englishTranslation",
  "reference",
];

export function DailyInspirationForm({ action, submitLabel, item, error }: DailyInspirationFormProps) {
  const validate = useCallback(
    (values: DailyInspirationFormValues) => validateDailyInspirationForm(values),
    [],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      kind: (item?.kind ?? "QURAN") as DailyInspirationFormValues["kind"],
      arabicText: item?.arabicText ?? "",
      englishTranslation: item?.englishTranslation ?? "",
      reference: item?.reference ?? "",
      published: item?.published ?? true,
    },
    fields: DAILY_INSPIRATION_FIELDS,
    validate,
  });

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      {error && (
        <p className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <fieldset>
        <legend className={labelClassName}>Type</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="kind"
              value="QURAN"
              checked={values.kind === "QURAN"}
              onChange={() => updateField("kind", "QURAN")}
              className="text-primary"
            />
            Quranic verse
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="kind"
              value="HADITH"
              checked={values.kind === "HADITH"}
              onChange={() => updateField("kind", "HADITH")}
              className="text-primary"
            />
            Hadith
          </label>
        </div>
      </fieldset>

      <div>
        <label htmlFor="arabicText" className={labelClassName}>
          Arabic text <span className="text-destructive-text">*</span>
        </label>
        <textarea
          id="arabicText"
          name="arabicText"
          required
          dir="rtl"
          rows={5}
          value={values.arabicText}
          onChange={(e) => updateField("arabicText", e.target.value)}
          onBlur={() => markTouched("arabicText")}
          aria-invalid={showError("arabicText") || undefined}
          placeholder="النص العربي…"
          className={`${formFieldInputClass(showError("arabicText"))} indo-pak-arabic text-lg leading-loose`}
        />
        {showError("arabicText") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.arabicText}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="englishTranslation" className={labelClassName}>
          English translation <span className="text-destructive-text">*</span>
        </label>
        <textarea
          id="englishTranslation"
          name="englishTranslation"
          required
          rows={4}
          value={values.englishTranslation}
          onChange={(e) => updateField("englishTranslation", e.target.value)}
          onBlur={() => markTouched("englishTranslation")}
          aria-invalid={showError("englishTranslation") || undefined}
          placeholder="English meaning or translation…"
          className={formFieldInputClass(showError("englishTranslation"))}
        />
        {showError("englishTranslation") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.englishTranslation}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="reference" className={labelClassName}>
          Reference (optional)
        </label>
        <input
          id="reference"
          name="reference"
          maxLength={300}
          value={values.reference}
          onChange={(e) => updateField("reference", e.target.value)}
          onBlur={() => markTouched("reference")}
          aria-invalid={showError("reference") || undefined}
          placeholder="e.g. Surah Al-Baqarah 2:255 or Sahih al-Bukhari 1"
          className={formFieldInputClass(showError("reference"))}
        />
        {showError("reference") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.reference}
          </p>
        )}
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          checked={values.published}
          onChange={(e) => updateField("published", e.target.checked)}
          className="rounded border-border text-primary"
        />
        Publish on homepage (latest published entry is shown)
      </label>

      <button
        type="submit"
        disabled={!isValid}
        className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
