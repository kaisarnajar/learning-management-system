import { SubmitButton } from "@/components/shared/SubmitButton";
"use client";

import { useCallback } from "react";
import {
  type AcademySettingsFormValues,
  validateAcademySettingsForm,
} from "@/lib/admin-form-validation";
import type { AcademySettingsData } from "@/lib/academy-settings";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import { useZodForm } from "@/lib/use-zod-form";

type AcademySettingsFormProps = {
  settings: AcademySettingsData;
  action: (formData: FormData) => Promise<void>;
};

const ACADEMY_FIELDS: (keyof AcademySettingsFormValues)[] = [
  "academyName",
  "academyAddress",
  "academyWebsite",
];

export function AcademySettingsForm({ settings, action }: AcademySettingsFormProps) {
  const validate = useCallback(
    (values: AcademySettingsFormValues) => validateAcademySettingsForm(values),
    [],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      academyName: settings.academyName,
      academyAddress: settings.academyAddress,
      academyWebsite: settings.academyWebsite,
    },
    fields: ACADEMY_FIELDS,
    validate,
  });

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-8">
      <section className="space-y-4 rounded-lg border border-border bg-background/40 p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground">Academy Information</h2>
        <p className="text-sm text-muted">
          Used on official documents, payment receipts, and invoices.
        </p>
        
        <div>
          <label htmlFor="academyName" className={labelClassName}>
            Academy Name
          </label>
          <input
            id="academyName"
            name="academyName"
            type="text"
            required
            value={values.academyName}
            onChange={(e) => updateField("academyName", e.target.value)}
            onBlur={() => markTouched("academyName")}
            aria-invalid={showError("academyName") || undefined}
            placeholder="Darse Quran Academy"
            className={formFieldInputClass(showError("academyName"))}
          />
          {showError("academyName") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.academyName}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="academyAddress" className={labelClassName}>
            Academy Address
          </label>
          <input
            id="academyAddress"
            name="academyAddress"
            type="text"
            required
            value={values.academyAddress}
            onChange={(e) => updateField("academyAddress", e.target.value)}
            onBlur={() => markTouched("academyAddress")}
            aria-invalid={showError("academyAddress") || undefined}
            placeholder="Treran Tangmarg, Baramulla J&K 193402"
            className={formFieldInputClass(showError("academyAddress"))}
          />
          {showError("academyAddress") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.academyAddress}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="academyWebsite" className={labelClassName}>
            Website URL
          </label>
          <input
            id="academyWebsite"
            name="academyWebsite"
            type="text"
            required
            value={values.academyWebsite}
            onChange={(e) => updateField("academyWebsite", e.target.value)}
            onBlur={() => markTouched("academyWebsite")}
            aria-invalid={showError("academyWebsite") || undefined}
            placeholder="www.darsequranacademy.com"
            className={formFieldInputClass(showError("academyWebsite"))}
          />
          {showError("academyWebsite") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.academyWebsite}
            </p>
          )}
        </div>
      </section>

      <SubmitButton
        type="submit"
        disabled={!isValid}
        className="min-h-11 rounded-md bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        Save academy settings
      </SubmitButton>
    </form>
  );
}
