"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import {
  validateBookForm,
  type BookFormValues,
} from "@/lib/admin-form-validation";
import { type BookWithDetails, HOMEPAGE_FEATURED_BOOKS_MAX } from "@/lib/bookstore";
import { useZodForm } from "@/lib/use-zod-form";
import { labelClassName } from "@/lib/form";
import { formErrorTextClassName, formFieldInputClass } from "@/lib/form-validation";

type BookFormProps = {
  book?: BookWithDetails & { featuredOnHomepage?: boolean };
  featuredCount: number;
  action: (formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
};

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "COMING_SOON", label: "Coming Soon" },
];

export function BookForm({ book, featuredCount, action, submitLabel }: BookFormProps) {
  const isCurrentlyFeatured = book?.featuredOnHomepage ?? false;
  const featuredSlotsFull = featuredCount >= HOMEPAGE_FEATURED_BOOKS_MAX;
  const canFeatureThisItem = isCurrentlyFeatured || !featuredSlotsFull;
  const displayedFeaturedCount = Math.min(featuredCount, HOMEPAGE_FEATURED_BOOKS_MAX);

  const validate = useCallback((values: BookFormValues) => validateBookForm(values), []);

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      title: book?.title ?? "",
      author: book?.author ?? "",
      description: book?.description ?? "",
      priceInr: book ? String(book.priceInrPaise / 100) : "",
      mrpInr: book && book.mrpInrPaise > 0 ? String(book.mrpInrPaise / 100) : "",
      purchasePriceInr: book ? String(book.purchasePriceInrPaise / 100) : "",
      inventoryPurchased: book ? String(book.inventoryPurchased) : "",
      status: (book?.status as BookFormValues["status"]) ?? "AVAILABLE",
      published: book?.published ?? true,
      featuredOnHomepage: book?.featuredOnHomepage ?? false,
    },
    fields: ["title", "author", "description", "priceInr", "mrpInr", "purchasePriceInr", "inventoryPurchased", "status", "published", "featuredOnHomepage"],
    validate,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(
    book?.imagePath ?? null,
  );
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setServerError("");

    if (!isValid) return;

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("published", values.published ? "true" : "false");
    formData.set("featuredOnHomepage", values.featuredOnHomepage ? "true" : "false");

    try {
      const result = await action(formData);
      if (result?.error) {
        setServerError(result.error);
        setLoading(false);
      }
    } catch (err) {
      const error = err as { digest?: string; message?: string };
      if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_REDIRECT")) {
        throw err;
      }
      if (error?.message === "NEXT_REDIRECT") {
        throw err;
      }
      setServerError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Image */}
      <div>
        <label className="block text-sm font-medium text-foreground">
          Book cover image <span className="font-normal text-muted">(optional, max 2 MB)</span>
        </label>
        {imagePreview && (
          <div className="mt-2 h-40 w-32 overflow-hidden rounded-lg border border-border">
            <Image
              src={imagePreview}
              alt="Book cover preview"
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

      {/* Title */}
      <div>
        <label htmlFor="book-title" className={labelClassName}>
          Title <span className="text-destructive-text">*</span>
        </label>
        <input
          id="book-title"
          name="title"
          type="text"
          required
          value={values.title}
          onChange={(e) => updateField("title", e.target.value)}
          onBlur={() => markTouched("title")}
          aria-invalid={showError("title") || undefined}
          className={formFieldInputClass(showError("title"))}
        />
        {showError("title") && <p className={formErrorTextClassName} role="alert">{errors.title}</p>}
      </div>

      {/* Author */}
      <div>
        <label htmlFor="book-author" className={labelClassName}>
          Author <span className="text-destructive-text">*</span>
        </label>
        <input
          id="book-author"
          name="author"
          type="text"
          required
          value={values.author}
          onChange={(e) => updateField("author", e.target.value)}
          onBlur={() => markTouched("author")}
          aria-invalid={showError("author") || undefined}
          className={formFieldInputClass(showError("author"))}
        />
        {showError("author") && <p className={formErrorTextClassName} role="alert">{errors.author}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="book-description" className={labelClassName}>
          Description <span className="text-destructive-text">*</span>
        </label>
        <textarea
          id="book-description"
          name="description"
          required
          rows={4}
          value={values.description}
          onChange={(e) => updateField("description", e.target.value)}
          onBlur={() => markTouched("description")}
          aria-invalid={showError("description") || undefined}
          className={formFieldInputClass(showError("description"))}
        />
        {showError("description") && <p className={formErrorTextClassName} role="alert">{errors.description}</p>}
      </div>

      {/* Price & Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="book-price" className={labelClassName}>
            Selling Price (₹) <span className="text-destructive-text">*</span>
          </label>
          <input
            id="book-price"
            name="priceInr"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.priceInr}
            onChange={(e) => updateField("priceInr", e.target.value)}
            onBlur={() => markTouched("priceInr")}
            aria-invalid={showError("priceInr") || undefined}
            placeholder="e.g. 299"
            className={formFieldInputClass(showError("priceInr"))}
          />
          {showError("priceInr") && <p className={formErrorTextClassName} role="alert">{errors.priceInr}</p>}
        </div>

        <div>
          <label htmlFor="book-purchase-price" className={labelClassName}>
            Purchase Price (₹) <span className="text-destructive-text">*</span>
          </label>
          <input
            id="book-purchase-price"
            name="purchasePriceInr"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.purchasePriceInr}
            onChange={(e) => updateField("purchasePriceInr", e.target.value)}
            onBlur={() => markTouched("purchasePriceInr")}
            aria-invalid={showError("purchasePriceInr") || undefined}
            placeholder="e.g. 150"
            className={formFieldInputClass(showError("purchasePriceInr"))}
          />
          {showError("purchasePriceInr") && <p className={formErrorTextClassName} role="alert">{errors.purchasePriceInr}</p>}
        </div>
        
        <div>
          <label htmlFor="book-inventory" className={labelClassName}>
            Total Inventory Procured <span className="text-destructive-text">*</span>
          </label>
          <input
            id="book-inventory"
            name="inventoryPurchased"
            type="number"
            min="0"
            step="1"
            required
            value={values.inventoryPurchased}
            onChange={(e) => updateField("inventoryPurchased", e.target.value)}
            onBlur={() => markTouched("inventoryPurchased")}
            aria-invalid={showError("inventoryPurchased") || undefined}
            placeholder="e.g. 100"
            className={formFieldInputClass(showError("inventoryPurchased"))}
          />
          {showError("inventoryPurchased") && <p className={formErrorTextClassName} role="alert">{errors.inventoryPurchased}</p>}
        </div>

        <div>
          <label htmlFor="book-status" className={labelClassName}>
            Availability status <span className="text-destructive-text">*</span>
          </label>
          <select
            id="book-status"
            name="status"
            value={values.status}
            onChange={(e) => updateField("status", e.target.value as BookFormValues["status"])}
            onBlur={() => markTouched("status")}
            aria-invalid={showError("status") || undefined}
            className={formFieldInputClass(showError("status"))}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {showError("status") && <p className={formErrorTextClassName} role="alert">{errors.status}</p>}
        </div>
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
            <span className="mt-0.5 block text-muted">Uncheck to hide from the public bookstore.</span>
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
            checked={values.featuredOnHomepage}
            onChange={(e) => updateField("featuredOnHomepage", e.target.checked)}
            disabled={!canFeatureThisItem}
            className="mt-1 rounded border-border disabled:cursor-not-allowed"
          />
          <span>
            <span className="font-medium">Show on homepage</span>
            {canFeatureThisItem ? (
              <span className="mt-0.5 block text-muted">
                Featured in the Featured Books section when published (up to{" "}
                {HOMEPAGE_FEATURED_BOOKS_MAX}; {displayedFeaturedCount}/{HOMEPAGE_FEATURED_BOOKS_MAX}{" "}
                slots used). All published books still appear in the bookstore.
              </span>
            ) : (
              <span className="mt-0.5 block text-muted">
                There are already {HOMEPAGE_FEATURED_BOOKS_MAX} featured books. Remove one book
                from the homepage to add this item as a featured book.
              </span>
            )}
          </span>
        </label>
      </div>

      {serverError && (
        <p className="rounded-lg bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {serverError}
        </p>
      )}

      <SubmitButton
        type="submit"
        disabled={loading || !isValid}
        isSubmitting={loading}
        className="min-h-11 rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60 transition-colors"
      >
        {loading ? "Saving…" : submitLabel}
      </SubmitButton>
    </form>
  );
}
