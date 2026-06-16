"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  validateBookForm,
  type BookFormValues,
} from "@/lib/admin-form-validation";
import type { BookWithDetails } from "@/lib/bookstore";

type BookFormProps = {
  book?: BookWithDetails;
  action: (formData: FormData) => Promise<{ error?: string }>;
  submitLabel: string;
};

const STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "OUT_OF_STOCK", label: "Out of Stock" },
  { value: "COMING_SOON", label: "Coming Soon" },
];

export function BookForm({ book, action, submitLabel }: BookFormProps) {
  const [values, setValues] = useState<BookFormValues>({
    title: book?.title ?? "",
    author: book?.author ?? "",
    description: book?.description ?? "",
    priceInr: book ? String(book.priceInrPaise / 100) : "",
    status: (book?.status as BookFormValues["status"]) ?? "AVAILABLE",
    published: book?.published ?? true,
  });

  const [imagePreview, setImagePreview] = useState<string | null>(
    book?.imagePath ?? null,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target;
    const checked = type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;
    setValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setServerError("");

    const validation = validateBookForm(values);
    if (!validation.success) {
      const newErrors: Record<string, string> = {};
      for (const issue of validation.issues ?? []) {
        const key = issue.path[0] as string;
        newErrors[key] = issue.message;
      }
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("published", values.published ? "true" : "false");

    try {
      const result = await action(formData);
      if (result?.error) {
        setServerError(result.error);
        setLoading(false);
      }
    } catch {
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
        <label htmlFor="book-title" className="block text-sm font-medium text-foreground">
          Title <span className="text-red-600">*</span>
        </label>
        <input
          id="book-title"
          name="title"
          type="text"
          required
          value={values.title}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
      </div>

      {/* Author */}
      <div>
        <label htmlFor="book-author" className="block text-sm font-medium text-foreground">
          Author <span className="text-red-600">*</span>
        </label>
        <input
          id="book-author"
          name="author"
          type="text"
          required
          value={values.author}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {errors.author && <p className="mt-1 text-xs text-red-600">{errors.author}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="book-description" className="block text-sm font-medium text-foreground">
          Description <span className="text-red-600">*</span>
        </label>
        <textarea
          id="book-description"
          name="description"
          required
          rows={4}
          value={values.description}
          onChange={handleChange}
          className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
        {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
      </div>

      {/* Price & Status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="book-price" className="block text-sm font-medium text-foreground">
            Price (₹) <span className="text-red-600">*</span>
          </label>
          <input
            id="book-price"
            name="priceInr"
            type="number"
            min="0"
            step="0.01"
            required
            value={values.priceInr}
            onChange={handleChange}
            placeholder="e.g. 299"
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          {errors.priceInr && <p className="mt-1 text-xs text-red-600">{errors.priceInr}</p>}
        </div>

        <div>
          <label htmlFor="book-status" className="block text-sm font-medium text-foreground">
            Availability status <span className="text-red-600">*</span>
          </label>
          <select
            id="book-status"
            name="status"
            value={values.status}
            onChange={handleChange}
            className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Published toggle */}
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          name="published"
          checked={values.published}
          onChange={handleChange}
          className="h-4 w-4 rounded text-primary"
        />
        <span className="text-sm font-medium text-foreground">
          Published{" "}
          <span className="font-normal text-muted">
            (visible to users on the Bookstore page)
          </span>
        </span>
      </label>

      {serverError && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="min-h-11 rounded-full bg-primary px-8 py-2.5 text-sm font-semibold text-white hover:bg-primary-light disabled:opacity-60"
      >
        {loading ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
