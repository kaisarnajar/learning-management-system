"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import type { LibraryItem } from "@prisma/client";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import {
  type LibraryFormValues,
  validateLibraryForm,
} from "@/services/admin-form-validation";
import { HOMEPAGE_FEATURED_RESOURCES_MAX } from "@/services/library";
import { getLibraryLanguageOptions, getLibraryTopicOptions } from "@/services/library-options";
import { labelClassName } from "@/utils/form";
import { formErrorTextClassName, formFieldInputClass } from "@/utils/form-validation";
import { useZodForm } from "@/utils/use-zod-form";

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
    item?.imagePath ?? null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  }

  function handleClearFile() {
    setImagePreview(null);
    if (fileRef.current) {
      fileRef.current.value = "";
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

  const [topicSelect, setTopicSelect] = useState(() => {
    const val = item?.topic ?? "";
    const isStandard = topicOptions.some((opt) => opt.value === val);
    if (val && !isStandard) return "Other";
    return val;
  });
  const isCustomTopic = topicSelect === "Other";

  const [languageSelect, setLanguageSelect] = useState(() => {
    const val = item?.language ?? "";
    const isStandard = languageOptions.some((opt) => opt.value === val);
    if (val && !isStandard) return "Other";
    return val;
  });
  const isCustomLanguage = languageSelect === "Other";

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-foreground">
          Cover image <span className="font-normal text-muted">(optional, max 2 MB)</span>
        </label>
        {imagePreview && (
          <div className="mt-2 flex items-start gap-4">
            <div className="h-40 w-32 shrink-0 overflow-hidden rounded-lg border border-border">
              <Image
                src={imagePreview}
                alt="Cover preview"
                width={128}
                height={160}
                className="h-full w-full object-cover"
              />
            </div>
            <button
              type="button"
              onClick={handleClearFile}
              className="text-sm font-medium text-destructive-text hover:underline"
            >
              Clear
            </button>
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
        <input
          type="hidden"
          name="removeImage"
          value={!imagePreview && item?.imagePath ? "true" : "false"}
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
        <div className="space-y-4">
          <div>
            <label htmlFor="topicSelect" className={labelClassName}>
              Topic
            </label>
            <select
              id="topicSelect"
              name={isCustomTopic ? "topicSelect" : "topic"}
              required
              value={topicSelect}
              onChange={(e) => {
                const val = e.target.value;
                setTopicSelect(val);
                if (val !== "Other") {
                  updateField("topic", val);
                  markTouched("topic");
                } else {
                  updateField("topic", "");
                }
              }}
              aria-invalid={(showError("topic") && !isCustomTopic) || undefined}
              className={formFieldInputClass(showError("topic") && !isCustomTopic)}
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
          </div>
          {isCustomTopic && (
            <div>
              <label htmlFor="customTopic" className={labelClassName}>
                Specify Topic <span className="text-destructive-text">*</span>
              </label>
              <input
                id="customTopic"
                name="topic"
                type="text"
                required
                value={values.topic}
                onChange={(e) => updateField("topic", e.target.value)}
                onBlur={() => markTouched("topic")}
                aria-invalid={showError("topic") || undefined}
                placeholder="Enter custom topic"
                className={formFieldInputClass(showError("topic"))}
              />
            </div>
          )}
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
        <div className="space-y-4">
          <div>
            <label htmlFor="languageSelect" className={labelClassName}>
              Language
            </label>
            <select
              id="languageSelect"
              name={isCustomLanguage ? "languageSelect" : "language"}
              required
              value={languageSelect}
              onChange={(e) => {
                const val = e.target.value;
                setLanguageSelect(val);
                if (val !== "Other") {
                  updateField("language", val);
                  markTouched("language");
                } else {
                  updateField("language", "");
                }
              }}
              aria-invalid={(showError("language") && !isCustomLanguage) || undefined}
              className={formFieldInputClass(showError("language") && !isCustomLanguage)}
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
          </div>
          {isCustomLanguage && (
            <div>
              <label htmlFor="customLanguage" className={labelClassName}>
                Specify Language <span className="text-destructive-text">*</span>
              </label>
              <input
                id="customLanguage"
                name="language"
                type="text"
                required
                value={values.language}
                onChange={(e) => updateField("language", e.target.value)}
                onBlur={() => markTouched("language")}
                aria-invalid={showError("language") || undefined}
                placeholder="Enter custom language"
                className={formFieldInputClass(showError("language"))}
              />
            </div>
          )}
          {showError("language") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.language}
            </p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="pdfUrl" className={labelClassName}>
          PDF URL <span className="text-destructive-text">*</span>
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
      <SubmitButton
        type="submit"
        disabled={!isValid}
        className="min-h-11 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
