import { SubmitButton } from "@/components/shared/SubmitButton";
"use client";

import type { AnnouncementCategory, CourseAnnouncement } from "@prisma/client";
import Link from "next/link";
import { useCallback } from "react";
import {
  type CourseAnnouncementFormValues,
  validateCourseAnnouncementForm,
} from "@/lib/admin-form-validation";
import { ANNOUNCEMENT_CATEGORIES, announcementCategoryLabels } from "@/lib/announcements";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import { useZodForm } from "@/lib/use-zod-form";

type AnnouncementFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  announcement?: Pick<
    CourseAnnouncement,
    "category" | "title" | "body" | "attachmentPath" | "attachmentName"
  >;
  defaultCategory?: AnnouncementCategory;
  audienceHint?: string;
  error?: string;
};

const ANNOUNCEMENT_FIELDS: (keyof CourseAnnouncementFormValues)[] = ["category", "title", "body"];

export function AnnouncementForm({
  action,
  submitLabel,
  announcement,
  defaultCategory = "COURSE_ANNOUNCEMENT",
  audienceHint,
  error,
}: AnnouncementFormProps) {
  const hasAttachment = Boolean(announcement?.attachmentPath && announcement?.attachmentName);

  const validate = useCallback(
    (values: CourseAnnouncementFormValues) => validateCourseAnnouncementForm(values),
    [],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      category: (announcement?.category ?? defaultCategory) as AnnouncementCategory,
      title: announcement?.title ?? "",
      body: announcement?.body ?? "",
    },
    fields: ANNOUNCEMENT_FIELDS,
    validate,
  });

  return (
    <form action={action} encType="multipart/form-data" className="mx-auto max-w-2xl space-y-5">
      {error && (
        <p className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      <div>
        <label htmlFor="category" className={labelClassName}>
          Category
        </label>
        <select
          id="category"
          name="category"
          required
          value={values.category}
          onChange={(e) => updateField("category", e.target.value as AnnouncementCategory)}
          onBlur={() => markTouched("category")}
          aria-invalid={showError("category") || undefined}
          className={formFieldInputClass(showError("category"))}
        >
          {ANNOUNCEMENT_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {announcementCategoryLabels[value]}
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
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={200}
          value={values.title}
          onChange={(e) => updateField("title", e.target.value)}
          onBlur={() => markTouched("title")}
          aria-invalid={showError("title") || undefined}
          placeholder="e.g. Mid-term exam schedule"
          className={formFieldInputClass(showError("title"))}
        />
        {showError("title") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="body" className={labelClassName}>
          Message
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={8}
          value={values.body}
          onChange={(e) => updateField("body", e.target.value)}
          onBlur={() => markTouched("body")}
          aria-invalid={showError("body") || undefined}
          placeholder="Write the full announcement for your students…"
          className={formFieldInputClass(showError("body"))}
        />
        {showError("body") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.body}
          </p>
        )}
        <p className="mt-1.5 text-xs text-muted">
          {audienceHint ?? "Students enrolled in this course will see this announcement."}
        </p>
      </div>

      <div>
        <label htmlFor="attachment" className={labelClassName}>
          Material (optional)
        </label>
        {hasAttachment && (
          <div className="mb-3 rounded-lg border border-border bg-background/50 px-4 py-3">
            <p className="text-xs text-muted">Current file</p>
            <Link
              href={announcement!.attachmentPath!}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
            >
              {announcement!.attachmentName}
            </Link>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="removeAttachment" value="1" className="rounded border-border" />
              Remove current file
            </label>
          </div>
        )}
        <input
          id="attachment"
          name="attachment"
          type="file"
          accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp,image/gif"
          className="mt-1 block w-full text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary/20"
        />
        <p className="mt-1.5 text-xs text-muted">
          PDF, Word (.doc, .docx), or image — up to 10 MB. Leave empty if you only need a text announcement.
        </p>
      </div>

      <SubmitButton
        type="submit"
        disabled={!isValid}
        className="min-h-11 w-full rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
