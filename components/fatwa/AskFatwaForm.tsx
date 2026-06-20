"use client";

import { useCallback } from "react";
import { useActionState } from "react";
import { submitFatwaQuestion, type SubmitFatwaState } from "@/app/fatwa/actions";
import { FATWA_CATEGORIES } from "@/lib/fatwa";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import {
  type AskFatwaFormValues,
  validateAskFatwaForm,
} from "@/lib/profile-form-validation";
import { useZodForm } from "@/lib/use-zod-form";
import { trackButtonClick } from "@/lib/analytics-client";

type AskFatwaFormProps = {
  defaultName?: string;
  defaultEmail?: string;
  isLoggedIn?: boolean;
};

const ASK_FATWA_FIELDS: (keyof AskFatwaFormValues)[] = [
  "category",
  "title",
  "question",
  "askerName",
  "askerEmail",
];

const initialState: SubmitFatwaState = {};

export function AskFatwaForm({
  defaultName = "",
  defaultEmail = "",
  isLoggedIn = false,
}: AskFatwaFormProps) {
  const [state, formAction, pending] = useActionState(submitFatwaQuestion, initialState);

  const validate = useCallback(
    (values: AskFatwaFormValues) => validateAskFatwaForm(values),
    [],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      category: "",
      title: "",
      question: "",
      askerName: defaultName,
      askerEmail: defaultEmail,
    },
    fields: ASK_FATWA_FIELDS,
    validate,
  });

  return (
    <form
      action={formAction}
      onSubmit={() => {
        if (isValid) {
          trackButtonClick("Submit Question", "/fatwa/ask");
        }
      }}
      className="card-elevated space-y-5 p-6 sm:p-8"
    >
      {state.error && (
        <p className="rounded-lg bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="category" className={labelClassName}>
          Category <span className="text-destructive-text">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          value={values.category}
          onChange={(e) => updateField("category", e.target.value)}
          onBlur={() => markTouched("category")}
          aria-invalid={showError("category") || undefined}
          className={formFieldInputClass(showError("category"))}
        >
          <option value="" disabled>
            Select a topic
          </option>
          {FATWA_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {showError("category") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.category}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="title" className={labelClassName}>
          Subject <span className="text-destructive-text">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={200}
          value={values.title}
          onChange={(e) => updateField("title", e.target.value)}
          onBlur={() => markTouched("title")}
          aria-invalid={showError("title") || undefined}
          placeholder="Brief summary of your question"
          className={formFieldInputClass(showError("title"))}
        />
        {showError("title") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="question" className={labelClassName}>
          Your question <span className="text-destructive-text">*</span>
        </label>
        <textarea
          id="question"
          name="question"
          required
          maxLength={5000}
          rows={6}
          value={values.question}
          onChange={(e) => updateField("question", e.target.value)}
          onBlur={() => markTouched("question")}
          aria-invalid={showError("question") || undefined}
          placeholder="Describe your question in detail (e.g. Fiqh, Quran, Tajweed, daily practice)"
          className={formFieldInputClass(showError("question"))}
        />
        {showError("question") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.question}
          </p>
        )}
      </div>

      {!isLoggedIn ? (
        <>
          <div>
            <label htmlFor="askerName" className={labelClassName}>
              Your name <span className="text-destructive-text">*</span>
            </label>
            <input
              id="askerName"
              name="askerName"
              type="text"
              required
              value={values.askerName}
              onChange={(e) => updateField("askerName", e.target.value)}
              onBlur={() => markTouched("askerName")}
              aria-invalid={showError("askerName") || undefined}
              className={formFieldInputClass(showError("askerName"))}
              autoComplete="name"
            />
            {showError("askerName") && (
              <p className={formErrorTextClassName} role="alert">
                {errors.askerName}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="askerEmail" className={labelClassName}>
              Email <span className="text-destructive-text">*</span>
            </label>
            <p className="mt-0.5 text-xs text-muted">We will email you when your question is answered.</p>
            <input
              id="askerEmail"
              name="askerEmail"
              type="email"
              required
              value={values.askerEmail}
              onChange={(e) => updateField("askerEmail", e.target.value)}
              onBlur={() => markTouched("askerEmail")}
              aria-invalid={showError("askerEmail") || undefined}
              className={formFieldInputClass(showError("askerEmail"))}
              autoComplete="email"
            />
            {showError("askerEmail") && (
              <p className={formErrorTextClassName} role="alert">
                {errors.askerEmail}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          <input type="hidden" name="askerName" value={values.askerName} />
          <input type="hidden" name="askerEmail" value={values.askerEmail} />
          <p className="text-sm text-muted">
            Submitting as <span className="font-medium text-foreground">{values.askerName}</span> (
            {values.askerEmail}). We will email you when answered.
          </p>
        </>
      )}

      <button
        type="submit"
        disabled={!isValid || pending}
        className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit question"}
      </button>
    </form>
  );
}
