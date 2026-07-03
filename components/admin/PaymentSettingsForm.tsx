"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import { useCallback } from "react";
import {
  type PaymentSettingsFormValues,
  validatePaymentSettingsForm,
} from "@/lib/admin-form-validation";
import type { PaymentSettingsData } from "@/lib/payment-settings";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import { useZodForm } from "@/lib/use-zod-form";

type PaymentSettingsFormProps = {
  settings: PaymentSettingsData;
  action: (formData: FormData) => Promise<void>;
};

const PAYMENT_FIELDS: (keyof PaymentSettingsFormValues)[] = [
  "upiId",
  "upiNumber",
  "upiPayeeName",
  "bankAccountName",
  "bankName",
  "bankAccountNumber",
  "bankIfsc",
  "bankBranch",
];

export function PaymentSettingsForm({ settings, action }: PaymentSettingsFormProps) {
  const validate = useCallback(
    (values: PaymentSettingsFormValues) => validatePaymentSettingsForm(values),
    [],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      upiId: settings.upiId,
      upiNumber: settings.upiNumber,
      upiPayeeName: settings.upiPayeeName,
      bankAccountName: settings.bankAccountName,
      bankName: settings.bankName,
      bankAccountNumber: settings.bankAccountNumber,
      bankIfsc: settings.bankIfsc,
      bankBranch: settings.bankBranch,
    },
    fields: PAYMENT_FIELDS,
    validate,
  });

  function markAllTouched() {
    for (const field of PAYMENT_FIELDS) {
      markTouched(field);
    }
  }

  return (
    <form
      action={action}
      className="mx-auto max-w-2xl space-y-8"
      noValidate
      onSubmit={(event) => {
        if (!isValid) {
          event.preventDefault();
          markAllTouched();
        }
      }}
    >
      <section className="space-y-4 rounded-lg border border-border bg-background/40 p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground">UPI</h2>
        <p className="text-sm text-muted">
          Shown on student payment pages and used for QR codes.
        </p>
        <div>
          <label htmlFor="upiId" className={labelClassName}>
            UPI ID
          </label>
          <input
            id="upiId"
            name="upiId"
            type="text"
            value={values.upiId}
            onChange={(e) => updateField("upiId", e.target.value)}
            onBlur={() => markTouched("upiId")}
            placeholder="yourname@bank"
            aria-invalid={showError("upiId") || undefined}
            className={formFieldInputClass(showError("upiId"))}
          />
          {showError("upiId") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.upiId}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="upiNumber" className={labelClassName}>
            UPI Number (optional)
          </label>
          <input
            id="upiNumber"
            name="upiNumber"
            type="text"
            value={values.upiNumber}
            onChange={(e) => updateField("upiNumber", e.target.value)}
            onBlur={() => markTouched("upiNumber")}
            placeholder="e.g. 9876543210"
            aria-invalid={showError("upiNumber") || undefined}
            className={formFieldInputClass(showError("upiNumber"))}
          />
          {showError("upiNumber") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.upiNumber}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="upiPayeeName" className={labelClassName}>
            Payee name
          </label>
          <input
            id="upiPayeeName"
            name="upiPayeeName"
            type="text"
            value={values.upiPayeeName}
            onChange={(e) => updateField("upiPayeeName", e.target.value)}
            onBlur={() => markTouched("upiPayeeName")}
            aria-invalid={showError("upiPayeeName") || undefined}
            className={formFieldInputClass(showError("upiPayeeName"))}
          />
          {showError("upiPayeeName") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.upiPayeeName}
            </p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-lg border border-border bg-background/40 p-5">
        <h2 className="font-serif text-lg font-semibold text-foreground">Bank transfer</h2>
        <p className="text-sm text-muted">Displayed alongside UPI for NEFT / IMPS / RTGS.</p>
        <div>
          <label htmlFor="bankAccountName" className={labelClassName}>
            Account name
          </label>
          <input
            id="bankAccountName"
            name="bankAccountName"
            type="text"
            value={values.bankAccountName}
            onChange={(e) => updateField("bankAccountName", e.target.value)}
            onBlur={() => markTouched("bankAccountName")}
            aria-invalid={showError("bankAccountName") || undefined}
            className={formFieldInputClass(showError("bankAccountName"))}
          />
          {showError("bankAccountName") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.bankAccountName}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="bankName" className={labelClassName}>
            Bank name
          </label>
          <input
            id="bankName"
            name="bankName"
            type="text"
            value={values.bankName}
            onChange={(e) => updateField("bankName", e.target.value)}
            onBlur={() => markTouched("bankName")}
            aria-invalid={showError("bankName") || undefined}
            className={formFieldInputClass(showError("bankName"))}
          />
          {showError("bankName") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.bankName}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="bankAccountNumber" className={labelClassName}>
            Account number
          </label>
          <input
            id="bankAccountNumber"
            name="bankAccountNumber"
            type="text"
            value={values.bankAccountNumber}
            onChange={(e) => updateField("bankAccountNumber", e.target.value)}
            onBlur={() => markTouched("bankAccountNumber")}
            aria-invalid={showError("bankAccountNumber") || undefined}
            className={formFieldInputClass(showError("bankAccountNumber"))}
          />
          {showError("bankAccountNumber") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.bankAccountNumber}
            </p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="bankIfsc" className={labelClassName}>
              IFSC code
            </label>
            <input
              id="bankIfsc"
              name="bankIfsc"
              type="text"
              value={values.bankIfsc}
              onChange={(e) => updateField("bankIfsc", e.target.value)}
              onBlur={() => markTouched("bankIfsc")}
              aria-invalid={showError("bankIfsc") || undefined}
              className={formFieldInputClass(showError("bankIfsc"))}
            />
            {showError("bankIfsc") && (
              <p className={formErrorTextClassName} role="alert">
                {errors.bankIfsc}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="bankBranch" className={labelClassName}>
              Branch (optional)
            </label>
            <input
              id="bankBranch"
              name="bankBranch"
              type="text"
              value={values.bankBranch}
              onChange={(e) => updateField("bankBranch", e.target.value)}
              onBlur={() => markTouched("bankBranch")}
              aria-invalid={showError("bankBranch") || undefined}
              className={formFieldInputClass(showError("bankBranch"))}
            />
            {showError("bankBranch") && (
              <p className={formErrorTextClassName} role="alert">
                {errors.bankBranch}
              </p>
            )}
          </div>
        </div>
      </section>

      <SubmitButton
        type="submit"
        disabled={!isValid}
        className="min-h-11 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        Save payment details
      </SubmitButton>
    </form>
  );
}
