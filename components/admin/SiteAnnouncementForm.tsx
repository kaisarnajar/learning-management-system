"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import type { SiteAnnouncement } from "@prisma/client";
import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { DateInputField } from "@/components/form/DateInputField";
import {
  type SiteAnnouncementFormValues,
  validateSiteAnnouncementForm,
} from "@/lib/admin-form-validation";
import { getFormDateInputValue } from "@/lib/form-date";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";
import { HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX } from "@/lib/site-announcements";
import { MAX_ANNOUNCEMENT_IMAGES } from "@/lib/site-announcement-upload";
import { useZodForm } from "@/lib/use-zod-form";

type SiteAnnouncementFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  announcement?: SiteAnnouncement & {
    images?: { id: string; imagePath: string; caption: string | null; sortOrder: number }[];
  };
  featuredCount: number;
  error?: string;
};



export function SiteAnnouncementForm({
  action,
  submitLabel,
  announcement,
  featuredCount,
  error,
}: SiteAnnouncementFormProps) {
  const eventDateInputValue = getFormDateInputValue(announcement?.eventDate);
  const isCurrentlyFeatured = announcement?.showOnHomepage ?? false;
  const featuredSlotsFull = featuredCount >= HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX;
  const canFeatureThisAnnouncement = isCurrentlyFeatured || !featuredSlotsFull;
  const displayedFeaturedCount = Math.min(featuredCount, HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX);

  const fileRef = useRef<HTMLInputElement>(null);
  const [hasFiles, setHasFiles] = useState(false);
  const slotsLeft = MAX_ANNOUNCEMENT_IMAGES - (announcement?.images?.length ?? 0);

  const handleClearFiles = () => {
    if (fileRef.current) {
      fileRef.current.value = "";
    }
    setHasFiles(false);
  };

  const validate = useCallback(
    (values: SiteAnnouncementFormValues) => validateSiteAnnouncementForm(values),
    [],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      title: announcement?.title ?? "",
      body: announcement?.body ?? "",
      location: announcement?.location ?? "",
      eventDate: eventDateInputValue,
      showOnHomepage: announcement?.showOnHomepage ?? false,
      published: announcement?.published ?? true,
    },
    fields: [
      "title",
      "body",
      "location",
      "eventDate",
      "showOnHomepage",
      "published"
    ],
    validate,
  });

  const eventDateError = showError("eventDate") ? errors.eventDate : undefined;

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      {error && (
        <p className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

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
          placeholder="e.g. Guest Mufti visit — Masjid Al-Noor"
          className={formFieldInputClass(showError("title"))}
        />
        {showError("title") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.title}
          </p>
        )}
      </div>

      <DateInputField
        id="eventDate"
        name="eventDate"
        label="Event date (optional)"
        value={values.eventDate}
        onChange={(value) => updateField("eventDate", value)}
        onBlur={() => markTouched("eventDate")}
        hasError={Boolean(eventDateError)}
        errorMessage={eventDateError}
        errorId="event-date-error"
      />

      <div>
        <label htmlFor="location" className={labelClassName}>
          Location (optional)
        </label>
        <input
          id="location"
          name="location"
          maxLength={200}
          value={values.location}
          onChange={(e) => updateField("location", e.target.value)}
          onBlur={() => markTouched("location")}
          aria-invalid={showError("location") || undefined}
          placeholder="e.g. Masjid Al-Noor, Srinagar"
          className={formFieldInputClass(showError("location"))}
        />
        {showError("location") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.location}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="body" className={labelClassName}>
          Announcement
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
          placeholder="Full details for students and visitors…"
          className={formFieldInputClass(showError("body"))}
        />
        {showError("body") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.body}
          </p>
        )}
      </div>

      {announcement && announcement.images && announcement.images.length > 0 && (
        <div>
          <p className={labelClassName}>Screenshots & photos</p>
          <ul className="mt-2 space-y-4">
            {announcement.images.map((img) => (
              <li
                key={img.id}
                className="overflow-hidden rounded-lg border border-border bg-background/50"
              >
                <div className="relative aspect-video max-h-48 w-full bg-background">
                  <Image
                    src={img.imagePath}
                    alt={img.caption ?? ""}
                    fill
                    className="object-contain"
                    sizes="(max-width: 672px) 100vw, 672px"
                  />
                </div>
                <label className="flex items-center gap-2 px-4 py-3 text-sm text-foreground">
                  <input
                    type="checkbox"
                    name="removeImage"
                    value={img.id}
                    className="rounded border-border"
                  />
                  Remove this image
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="images" className={labelClassName}>
            {announcement ? "Add more images" : "Screenshots & photos (optional)"}
          </label>
          {hasFiles && (
            <button
              type="button"
              onClick={handleClearFiles}
              className="text-xs font-medium text-destructive-text hover:underline"
            >
              Clear selection
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          id="images"
          name="images"
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => setHasFiles((e.target.files?.length ?? 0) > 0)}
          className="mt-1 block w-full text-sm text-foreground file:mr-4 file:rounded-full file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary"
        />
        <p className="mt-1.5 text-xs text-muted">
          JPEG, PNG, WebP, or GIF — up to 5 MB each.{" "}
          {announcement
            ? `You can add ${slotsLeft} more image${slotsLeft === 1 ? "" : "s"} (max ${MAX_ANNOUNCEMENT_IMAGES} total).`
            : `Up to ${MAX_ANNOUNCEMENT_IMAGES} images per announcement.`}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-background/40 px-4 py-4">
        <label
          className={`flex items-start gap-3 text-sm text-foreground ${
            canFeatureThisAnnouncement ? "cursor-pointer" : ""
          }`}
        >
          <input
            type="checkbox"
            name="showOnHomepage"
            checked={values.showOnHomepage}
            disabled={!canFeatureThisAnnouncement}
            onChange={(e) => updateField("showOnHomepage", e.target.checked)}
            className="mt-1 rounded border-border disabled:cursor-not-allowed"
          />
          <span>
            <span className="font-medium">Show on homepage</span>
            {canFeatureThisAnnouncement ? (
              <span className="mt-0.5 block text-muted">
                Featured in the Featured Announcements section when published (up to{" "}
                {HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX}; {displayedFeaturedCount}/
                {HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX} slots used). All published announcements still
                appear on the Announcements page.
              </span>
            ) : (
              <span className="mt-0.5 block text-muted">
                There are already {HOMEPAGE_FEATURED_ANNOUNCEMENTS_MAX} featured announcements.
                Remove one announcement from the homepage to add this one as a featured announcement.
              </span>
            )}
          </span>
        </label>
        {showError("showOnHomepage") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.showOnHomepage}
          </p>
        )}
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
            <span className="mt-0.5 block text-muted">Uncheck to save as draft (hidden from the public site).</span>
          </span>
        </label>
      </div>

      <SubmitButton
        type="submit"
        disabled={!isValid}
        className="min-h-11 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
