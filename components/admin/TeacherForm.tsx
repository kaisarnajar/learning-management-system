"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import type { Teacher } from "@prisma/client";
import { useCallback, useState } from "react";
import { previewTeacherAccount } from "@/app/admin/teachers/actions";
import {
  type TeacherFormValues,
  validateTeacherForm,
} from "@/lib/admin-form-validation";
import { deriveTeacherInitials } from "@/lib/teacher-admin";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import { useZodForm } from "@/lib/use-zod-form";

type TeacherFormProps = {
  teacher?: Teacher;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  error?: string;
};

const TEACHER_FIELDS: (keyof TeacherFormValues)[] = [
  "email",
  "specialization",
  "bio",
  "initials",
  "imageUrl",
];

export function TeacherForm({ teacher, action, submitLabel, error }: TeacherFormProps) {
  const [linkedName, setLinkedName] = useState(teacher?.name ?? "");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const validate = useCallback((values: TeacherFormValues) => validateTeacherForm(values), []);

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      email: teacher?.email ?? "",
      specialization: teacher?.specialization ?? "",
      bio: teacher?.bio ?? "",
      initials: teacher?.initials ?? "",
      imageUrl: teacher?.imageUrl ?? "",
      published: teacher?.published ?? true,
    },
    fields: TEACHER_FIELDS,
    validate,
  });

  const accountVerified = Boolean(values.email.trim() && linkedName && !lookupError);
  const canSubmit = isValid && accountVerified;

  async function runLookup(targetEmail: string) {
    const trimmed = targetEmail.trim();
    if (!trimmed) {
      setLinkedName("");
      setLookupError("");
      return;
    }

    setLookupLoading(true);
    setLookupError("");
    try {
      const result = await previewTeacherAccount(trimmed, teacher?.id);
      if (result.ok) {
        setLinkedName(result.name);
        setLookupError("");
        if (!values.initials || !teacher) {
          updateField("initials", deriveTeacherInitials(result.name));
        }
      } else {
        setLinkedName("");
        setLookupError(result.error);
      }
    } catch {
      setLookupError("Could not verify this email. Try again.");
      setLinkedName("");
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      {error && (
        <p className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="email" className={labelClassName}>
          Registered account email
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id="email"
            name="email"
            type="email"
            required
            value={values.email}
            onChange={(e) => updateField("email", e.target.value)}
            onBlur={() => {
              markTouched("email");
              runLookup(values.email);
            }}
            aria-invalid={showError("email") || undefined}
            placeholder="teacher@example.com"
            className={`${formFieldInputClass(showError("email"))} flex-1`}
          />
          <button
            type="button"
            onClick={() => runLookup(values.email)}
            disabled={lookupLoading}
            className="min-h-11 shrink-0 rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground hover:bg-background disabled:opacity-60"
          >
            {lookupLoading ? "Checking…" : "Verify account"}
          </button>
        </div>
        <p className="mt-1.5 text-xs text-muted">
          The teacher must already have signed up on the site. We use their account name automatically; you
          set specialization and profile details below.
        </p>
        {showError("email") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.email}
          </p>
        )}
        {lookupError && (
          <p className="mt-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning-text" role="alert">
            {lookupError}
          </p>
        )}
      </div>

      <div>
        <label className={labelClassName}>Name (from account)</label>
        <p
          className={`mt-1 rounded-md border border-border bg-background/60 px-3 py-2.5 text-sm ${
            linkedName ? "font-medium text-foreground" : "text-muted"
          }`}
          aria-live="polite"
        >
          {linkedName || "Verify the email above to load the account name."}
        </p>
      </div>

      <div>
        <label htmlFor="specialization" className={labelClassName}>
          Specialization
        </label>
        <input
          id="specialization"
          name="specialization"
          required
          value={values.specialization}
          onChange={(e) => updateField("specialization", e.target.value)}
          onBlur={() => markTouched("specialization")}
          aria-invalid={showError("specialization") || undefined}
          placeholder="e.g. Quran & Tajweed"
          className={formFieldInputClass(showError("specialization"))}
        />
        {showError("specialization") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.specialization}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="bio" className={labelClassName}>
          Bio
        </label>
        <textarea
          id="bio"
          name="bio"
          required
          rows={4}
          value={values.bio}
          onChange={(e) => updateField("bio", e.target.value)}
          onBlur={() => markTouched("bio")}
          aria-invalid={showError("bio") || undefined}
          className={formFieldInputClass(showError("bio"))}
        />
        {showError("bio") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.bio}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="initials" className={labelClassName}>
            Initials (avatar)
          </label>
          <input
            id="initials"
            name="initials"
            maxLength={4}
            value={values.initials}
            onChange={(e) => updateField("initials", e.target.value.toUpperCase())}
            onBlur={() => markTouched("initials")}
            aria-invalid={showError("initials") || undefined}
            placeholder="Auto from name"
            className={formFieldInputClass(showError("initials"))}
          />
          {showError("initials") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.initials}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">Leave blank to auto-generate from the account name.</p>
        </div>
        <div>
          <label htmlFor="imageUrl" className={labelClassName}>
            Photo URL (optional)
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            value={values.imageUrl}
            onChange={(e) => updateField("imageUrl", e.target.value)}
            onBlur={() => markTouched("imageUrl")}
            aria-invalid={showError("imageUrl") || undefined}
            placeholder="https://..."
            className={formFieldInputClass(showError("imageUrl"))}
          />
          {showError("imageUrl") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.imageUrl}
            </p>
          )}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="published"
          checked={values.published}
          onChange={(e) => updateField("published", e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Published on public Teachers page
      </label>

      {teacher && (
        <p className="text-xs text-muted">
          Profile ID: <code className="rounded bg-background px-1">{teacher.id}</code>
        </p>
      )}

      <SubmitButton
        type="submit"
        disabled={!canSubmit}
        className="min-h-11 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
