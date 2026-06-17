"use client";

import type { LibraryItem } from "@prisma/client";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import {
  type LibraryFormValues,
  validateLibraryForm,
} from "@/lib/admin-form-validation";
import { HOMEPAGE_FEATURED_RESOURCES_MAX } from "@/lib/library";
import { getLibraryLanguageOptions, getLibraryTopicOptions } from "@/lib/library-options";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import { useZodForm } from "@/lib/use-zod-form";

type LibraryFormProps = {
  item?: LibraryItem;
  featuredCount: number;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

const LIBRARY_FIELDS: (keyof LibraryFormValues)[] = [
  "title",
  "author",
  "topic",
  "level",
  "language",
  "pdfUrl",
];

export function LibraryForm({ item, featuredCount, action, submitLabel }: LibraryFormProps) {
  const isCurrentlyFeatured = item?.featuredOnHomepage ?? false;
  const featuredSlotsFull = featuredCount >= HOMEPAGE_FEATURED_RESOURCES_MAX;
  const canFeatureThisItem = isCurrentlyFeatured || !featuredSlotsFull;
  const displayedFeaturedCount = Math.min(featuredCount, HOMEPAGE_FEATURED_RESOURCES_MAX);
  const topicOptions = getLibraryTopicOptions(item?.topic);
  const languageOptions = getLibraryLanguageOptions(item?.language);

  const [imagePreview, setImagePreview] = useState<string | null>(
    (item as LibraryItem & { imagePath?: string | null })?.imagePath ?? null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  }

  const validate = useCallback((values: LibraryFormValues) => validateLibraryForm(values), []);

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      title: item?.title ?? "",
      author: item?.author ?? "",
      topic: item?.topic ?? "",
      level: (item?.level ?? "Beginner") as LibraryFormValues["level"],
      language: item?.language ?? "",
      pdfUrl: item?.pdfUrl ?? "",
      published: item?.published ?? true,
    },
    fields: LIBRARY_FIELDS,
    validate,
  });

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-foreground">
          Cover image <span className="font-normal text-muted">(optional, max 2 MB)</span>
        </label>
        {imagePreview && (
          <div className="mt-2 h-40 w-32 overflow-hidden rounded-lg border border-border">
            <Image
              src={imagePreview}
              alt="Cover preview"
              width={128}
              height={160}
              className="h-full w-full object-cover"
            />
          </div>
        )}
        <input
          ref={fileRef}
          name="image"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleImageChange}
          className="mt-2 w-full text-sm text-muted file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-primary-light"
        />
      </div>
      <div>
        <label htmlFor="title" className={labelClassName}>
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          value={values.title}
          onChange={(e) => updateField("title", e.target.value)}
          onBlur={() => markTouched("title")}
          aria-invalid={showError("title") || undefined}
          className={formFieldInputClass(showError("title"))}
        />
        {showError("title") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.title}
          </p>
        )}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="author" className={labelClassName}>
            Author
          </label>
          <input
            id="author"
            name="author"
            required
            value={values.author}
            onChange={(e) => updateField("author", e.target.value)}
            onBlur={() => markTouched("author")}
            aria-invalid={showError("author") || undefined}
            className={formFieldInputClass(showError("author"))}
          />
          {showError("author") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.author}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="topic" className={labelClassName}>
            Topic
          </label>
          <select
            id="topic"
            name="topic"
            required
            value={values.topic}
            onChange={(e) => {
              updateField("topic", e.target.value);
              markTouched("topic");
            }}
            onBlur={() => markTouched("topic")}
            aria-invalid={showError("topic") || undefined}
            className={formFieldInputClass(showError("topic"))}
          >
            <option value="" disabled>
              Select…
            </option>
            {topicOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {showError("topic") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.topic}
            </p>
          )}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="level" className={labelClassName}>
            Level
          </label>
          <select
            id="level"
            name="level"
            value={values.level}
            onChange={(e) =>
              updateField("level", e.target.value as LibraryFormValues["level"])
            }
            className={formFieldInputClass(false)}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label htmlFor="language" className={labelClassName}>
            Language
          </label>
          <select
            id="language"
            name="language"
            required
            value={values.language}
            onChange={(e) => {
              updateField("language", e.target.value);
              markTouched("language");
            }}
            onBlur={() => markTouched("language")}
            aria-invalid={showError("language") || undefined}
            className={formFieldInputClass(showError("language"))}
          >
            <option value="" disabled>
              Select…
            </option>
            {languageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {showError("language") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.language}
            </p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="pdfUrl" className={labelClassName}>
          PDF URL <span className="text-red-600">*</span>
        </label>
        <input
          id="pdfUrl"
          name="pdfUrl"
          type="url"
          required
          value={values.pdfUrl}
          onChange={(e) => updateField("pdfUrl", e.target.value)}
          onBlur={() => markTouched("pdfUrl")}
          aria-invalid={showError("pdfUrl") || undefined}
          placeholder="https://..."
          className={formFieldInputClass(showError("pdfUrl"))}
        />
        {showError("pdfUrl") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.pdfUrl}
          </p>
        )}
      </div>
      <div className="space-y-3 rounded-lg border border-border bg-background/40 px-4 py-4">
        <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground">
          <input
            type="checkbox"
            name="published"
            checked={values.published}
            onChange={(e) => updateField("published", e.target.checked)}
            className="mt-1 rounded border-border"
          />
          <span>
            <span className="font-medium">Published</span>
            <span className="mt-0.5 block text-muted">Uncheck to hide from the public library.</span>
          </span>
        </label>
        <label
          className={`flex items-start gap-3 text-sm text-foreground ${
            canFeatureThisItem ? "cursor-pointer" : ""
          }`}
        >
          <input
            type="checkbox"
            name="featuredOnHomepage"
            defaultChecked={isCurrentlyFeatured}
            disabled={!canFeatureThisItem}
            className="mt-1 rounded border-border disabled:cursor-not-allowed"
          />
          <span>
            <span className="font-medium">Show on homepage</span>
            {canFeatureThisItem ? (
              <span className="mt-0.5 block text-muted">
                Featured in the Featured Resources section when published (up to{" "}
                {HOMEPAGE_FEATURED_RESOURCES_MAX}; {displayedFeaturedCount}/{HOMEPAGE_FEATURED_RESOURCES_MAX}{" "}
                slots used). All published items still appear in the library.
              </span>
            ) : (
              <span className="mt-0.5 block text-muted">
                There are already {HOMEPAGE_FEATURED_RESOURCES_MAX} featured resources. Remove one resource
                from the homepage to add this item as a featured resource.
              </span>
            )}
          </span>
        </label>
      </div>
      {item && (
        <p className="text-xs text-muted">
          ID: <code className="rounded bg-background px-1">{item.id}</code>
        </p>
      )}
      <button
        type="submit"
        disabled={!isValid}
        className="min-h-11 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}
