"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import { useCallback, useEffect, useActionState, useRef, useState } from "react";
import { useToast } from "@/components/shared/ToastProvider";
import { submitFatwaQuestion, type SubmitFatwaState } from "@/app/fatwa/actions";
import { getFatwaCategoryOptions } from "@/lib/fatwa";
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
  "isAnonymous",
];

const initialState: SubmitFatwaState = {};

export function AskFatwaForm({
  defaultName = "",
  defaultEmail = "",
  isLoggedIn = false,
}: AskFatwaFormProps) {
  const [state, formAction, pending] = useActionState(submitFatwaQuestion, initialState);

  const { addToast } = useToast();

  const validate = useCallback(
    (values: AskFatwaFormValues) => validateAskFatwaForm(values),
    [],
  );

  const { values, reset, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      category: "",
      title: "",
      question: "",
      askerName: defaultName,
      askerEmail: defaultEmail,
      isAnonymous: false,
    },
    fields: ASK_FATWA_FIELDS,
    validate,
  });

  const categoryOptions = getFatwaCategoryOptions(values.category);
  const [categorySelect, setCategorySelect] = useState(() => {
    const val = values.category ?? "";
    const isStandard = categoryOptions.some((opt) => opt.value === val);
    if (val && !isStandard) return "Other";
    return val;
  });
  const isCustomCategory = categorySelect === "Other";

  const prevSuccessRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (state.success && state.success !== prevSuccessRef.current) {
      addToast(state.success, "success");
      reset();
      prevSuccessRef.current = state.success;
    }
  }, [state.success, addToast, reset]);

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

      <div className="space-y-4">
        <div>
          <label htmlFor="categorySelect" className={labelClassName}>
            Category <span className="text-destructive-text">*</span>
          </label>
          <select
            id="categorySelect"
            name={isCustomCategory ? "categorySelect" : "category"}
            required
            value={categorySelect}
            onChange={(e) => {
              const val = e.target.value;
              setCategorySelect(val);
              if (val !== "Other") {
                updateField("category", val);
                markTouched("category");
              } else {
                updateField("category", "");
              }
            }}
            aria-invalid={(showError("category") && !isCustomCategory) || undefined}
            className={formFieldInputClass(showError("category") && !isCustomCategory)}
          >
            <option value="" disabled>
              Select a topic
            </option>
            {categoryOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {isCustomCategory && (
          <div>
            <label htmlFor="customCategory" className={labelClassName}>
              Specify Category <span className="text-destructive-text">*</span>
            </label>
            <input
              id="customCategory"
              name="category"
              type="text"
              required
              value={values.category}
              onChange={(e) => updateField("category", e.target.value)}
              onBlur={() => markTouched("category")}
              aria-invalid={showError("category") || undefined}
              placeholder="Enter custom category"
              className={formFieldInputClass(showError("category"))}
            />
          </div>
        )}
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

      <div className="flex items-center gap-2">
        <input
          id="isAnonymous"
          name="isAnonymous"
          type="checkbox"
          checked={values.isAnonymous}
          onChange={(e) => updateField("isAnonymous", e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="isAnonymous" className="text-sm font-medium text-foreground">
          Send Question Anonymously
        </label>
      </div>

      {!values.isAnonymous && (
        <>
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
        </>
      )}

      <SubmitButton
        type="submit"
        disabled={!isValid || pending}
        isSubmitting={pending}
        loadingText="Submitting…"
        className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        Submit question
      </SubmitButton>
    </form>
  );
}
