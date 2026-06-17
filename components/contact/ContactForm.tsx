"use client";

import { useCallback } from "react";
import { useActionState } from "react";
import { submitContactInquiry, type SubmitContactInquiryState } from "@/app/contact/actions";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import {
  type ContactInquiryFormValues,
  validateContactInquiryForm,
} from "@/lib/profile-form-validation";
import { useZodForm } from "@/lib/use-zod-form";

type ContactFormProps = {
  defaultName?: string;
  defaultEmail?: string;
  isLoggedIn?: boolean;
};

const CONTACT_FIELDS: (keyof ContactInquiryFormValues)[] = ["name", "email", "phone", "message"];

const initialState: SubmitContactInquiryState = {};

export function ContactForm({ defaultName = "", defaultEmail = "", isLoggedIn = false }: ContactFormProps) {
  const [state, formAction, pending] = useActionState(submitContactInquiry, initialState);

  const validate = useCallback(
    (values: ContactInquiryFormValues) => validateContactInquiryForm(values),
    [],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      name: defaultName,
      email: defaultEmail,
      phone: "",
      message: "",
    },
    fields: CONTACT_FIELDS,
    validate,
  });

  return (
    <form action={formAction} className="card-elevated space-y-5 p-6 sm:p-8">
      {state.error && (
        <p className="rounded-lg bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {state.error}
        </p>
      )}

      {!isLoggedIn ? (
        <>
          <div>
            <label htmlFor="name" className={labelClassName}>
              Full name <span className="text-red-600">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              onBlur={() => markTouched("name")}
              aria-invalid={showError("name") || undefined}
              className={formFieldInputClass(showError("name"))}
              autoComplete="name"
            />
            {showError("name") && (
              <p className={formErrorTextClassName} role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className={labelClassName}>
              Email <span className="text-red-600">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={values.email}
              onChange={(e) => updateField("email", e.target.value)}
              onBlur={() => markTouched("email")}
              aria-invalid={showError("email") || undefined}
              className={formFieldInputClass(showError("email"))}
              autoComplete="email"
            />
            {showError("email") && (
              <p className={formErrorTextClassName} role="alert">
                {errors.email}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="name" value={values.name} />
          <input type="hidden" name="email" value={values.email} />
          <p className="text-sm text-muted">
            Submitting as <span className="font-medium text-foreground">{values.name}</span> ({values.email}
            ). We will email you when the academy replies.
          </p>
        </>
      )}

      <div>
        <label htmlFor="phone" className={labelClassName}>
          Phone / WhatsApp <span className="text-red-600">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          inputMode="tel"
          value={values.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          onBlur={() => markTouched("phone")}
          aria-invalid={showError("phone") || undefined}
          placeholder="e.g. +91 70060 25120"
          className={formFieldInputClass(showError("phone"))}
          autoComplete="tel"
        />
        {showError("phone") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.phone}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="message" className={labelClassName}>
          Your message <span className="text-red-600">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={5000}
          value={values.message}
          onChange={(e) => updateField("message", e.target.value)}
          onBlur={() => markTouched("message")}
          aria-invalid={showError("message") || undefined}
          placeholder="Tell us about your query — course enrollment, schedules, fees, or anything else…"
          className={formFieldInputClass(showError("message"))}
        />
        {showError("message") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={!isValid || pending}
        className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
