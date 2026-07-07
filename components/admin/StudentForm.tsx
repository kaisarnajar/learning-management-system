"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import type { User } from "@prisma/client";
import { useCallback } from "react";
import {
  type StudentFormValues,
  validateStudentForm,
} from "@/services/admin-form-validation";
import { labelClassName } from "@/utils/form";
import { formErrorTextClassName, formFieldInputClass } from "@/utils/form-validation";
import { useZodForm } from "@/utils/use-zod-form";
import { OCCUPATION_OPTIONS } from "@/services/profile";

type StudentFormProps = {
  student: User;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  error?: string;
};

const STUDENT_FIELDS: (keyof StudentFormValues)[] = [
  "name",
  "fatherName",
  "dateOfBirth",
  "occupation",
  "address",
  "whatsapp",
];

export function StudentForm({ student, action, submitLabel, error }: StudentFormProps) {
  const validate = useCallback((values: StudentFormValues) => validateStudentForm(values), []);

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      name: student.name ?? "",
      fatherName: student.fatherName ?? "",
      dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().slice(0, 10) : "",
      occupation: student.occupation ?? "",
      address: student.address ?? "",
      whatsapp: student.whatsapp ?? "",
    },
    fields: STUDENT_FIELDS,
    validate,
  });

  const canSubmit = isValid;

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      {error && (
        <p className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="name" className={labelClassName}>
          Name
        </label>
        <div className="mt-1">
          <input
            id="name"
            name="name"
            type="text"
            required
            value={values.name}
            onChange={(e) => updateField("name", e.target.value)}
            onBlur={() => markTouched("name")}
            className={formFieldInputClass(showError("name"))}
          />
        </div>
        {showError("name") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div>
        <label className={labelClassName}>
          Email (Read-only)
        </label>
        <div className="mt-1">
          <input
            type="email"
            readOnly
            disabled
            value={student.email}
            className={`${formFieldInputClass(false)} bg-surface-muted cursor-not-allowed`}
          />
        </div>
      </div>

      <div>
        <label htmlFor="fatherName" className={labelClassName}>
          Father&apos;s Name
        </label>
        <div className="mt-1">
          <input
            id="fatherName"
            name="fatherName"
            type="text"
            required
            value={values.fatherName}
            onChange={(e) => updateField("fatherName", e.target.value)}
            onBlur={() => markTouched("fatherName")}
            className={formFieldInputClass(showError("fatherName"))}
          />
        </div>
        {showError("fatherName") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.fatherName}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="dateOfBirth" className={labelClassName}>
          Date of Birth
        </label>
        <div className="mt-1">
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            value={values.dateOfBirth}
            onChange={(e) => updateField("dateOfBirth", e.target.value)}
            onBlur={() => markTouched("dateOfBirth")}
            className={formFieldInputClass(showError("dateOfBirth"))}
          />
        </div>
        {showError("dateOfBirth") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.dateOfBirth}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="occupation" className={labelClassName}>
          Occupation
        </label>
        <div className="mt-1">
          <select
            id="occupation"
            name="occupation"
            required
            value={values.occupation}
            onChange={(e) => updateField("occupation", e.target.value)}
            onBlur={() => markTouched("occupation")}
            className={formFieldInputClass(showError("occupation"))}
          >
            <option value="" disabled>Select occupation</option>
            {OCCUPATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {showError("occupation") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.occupation}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="address" className={labelClassName}>
          Address
        </label>
        <div className="mt-1">
          <textarea
            id="address"
            name="address"
            required
            rows={3}
            value={values.address}
            onChange={(e) => updateField("address", e.target.value)}
            onBlur={() => markTouched("address")}
            className={formFieldInputClass(showError("address"))}
          />
        </div>
        {showError("address") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.address}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="whatsapp" className={labelClassName}>
          WhatsApp Number
        </label>
        <div className="mt-1">
          <input
            id="whatsapp"
            name="whatsapp"
            type="text"
            required
            value={values.whatsapp}
            onChange={(e) => updateField("whatsapp", e.target.value)}
            onBlur={() => markTouched("whatsapp")}
            className={formFieldInputClass(showError("whatsapp"))}
          />
        </div>
        {showError("whatsapp") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.whatsapp}
          </p>
        )}
      </div>

      <div className="pt-4">
        <SubmitButton
          loadingText="Saving..."
          disabled={!canSubmit}
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light w-full sm:w-auto"
        >
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
