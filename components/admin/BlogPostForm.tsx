"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import type { BlogImage } from "@prisma/client";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import {
  type BlogPostFormValues,
  validateBlogPostForm,
} from "@/services/admin-form-validation";
import { HOMEPAGE_FEATURED_BLOGS_MAX } from "@/services/blogs";
import { MAX_BLOG_IMAGES } from "@/services/blog-limits";
import { labelClassName } from "@/utils/form";
import { formErrorTextClassName, formFieldInputClass } from "@/utils/form-validation";
import { useZodForm } from "@/utils/use-zod-form";
import { RichTextEditor } from "@/components/shared/RichTextEditor";

type BlogPostFormPost = {
  title: string;
  excerpt: string | null;
  body: string;
  published: boolean;
  featuredOnHomepage?: boolean;
  images: BlogImage[];
};

type BlogPostFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  post?: BlogPostFormPost;
  featuredCount?: number;
  error?: string;
  mode?: "admin" | "teacher";
  contentReadOnly?: boolean;
};

const BLOG_FIELDS: (keyof BlogPostFormValues)[] = ["title", "excerpt", "body"];

export function BlogPostForm({
  action,
  submitLabel,
  post,
  featuredCount = 0,
  error,
  mode = "admin",
  contentReadOnly = false,
}: BlogPostFormProps) {
  const isTeacher = mode === "teacher";
  const imageCount = post?.images.length ?? 0;
  const slotsLeft = MAX_BLOG_IMAGES - imageCount;
  const isCurrentlyFeatured = post?.featuredOnHomepage ?? false;
  const featuredSlotsFull = featuredCount >= HOMEPAGE_FEATURED_BLOGS_MAX;
  const canFeatureThisPost = isCurrentlyFeatured || !featuredSlotsFull;
  const displayedFeaturedCount = Math.min(featuredCount, HOMEPAGE_FEATURED_BLOGS_MAX);

  const validate = useCallback(
    (values: BlogPostFormValues) => validateBlogPostForm(values, mode),
    [mode],
  );

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      title: post?.title ?? "",
      excerpt: post?.excerpt ?? "",
      body: post?.body ?? "",
      published: post?.published ?? false,
    },
    fields: BLOG_FIELDS,
    validate,
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [hasFiles, setHasFiles] = useState(false);

  function handleClearFiles() {
    if (fileRef.current) {
      fileRef.current.value = "";
      setHasFiles(false);
    }
  }

  return (
    <form action={action} encType="multipart/form-data" className="mx-auto max-w-2xl space-y-5">
      {error && (
        <p className="rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {error}
        </p>
      )}

      {contentReadOnly && (
        <p className="rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          This post was submitted by a teacher for approval. Title, summary, content, and images cannot
          be changed here. You can update publishing and homepage settings below, or use Approve / Reject on
          Blog approvals.
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
          readOnly={contentReadOnly}
          value={values.title}
          onChange={(e) => updateField("title", e.target.value)}
          onBlur={() => markTouched("title")}
          aria-invalid={showError("title") || undefined}
          placeholder="e.g. Tips for memorizing Quran with tajweed"
          className={`${formFieldInputClass(showError("title"))}${contentReadOnly ? " cursor-default bg-background/60" : ""}`}
        />
        {showError("title") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="excerpt" className={labelClassName}>
          Short summary (optional)
        </label>
        <textarea
          id="excerpt"
          name="excerpt"
          rows={2}
          maxLength={400}
          readOnly={contentReadOnly}
          value={values.excerpt}
          onChange={(e) => updateField("excerpt", e.target.value)}
          onBlur={() => markTouched("excerpt")}
          aria-invalid={showError("excerpt") || undefined}
          placeholder="A brief line shown on the blog listing page…"
          className={`${formFieldInputClass(showError("excerpt"))}${contentReadOnly ? " cursor-default bg-background/60" : ""}`}
        />
        {showError("excerpt") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.excerpt}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="body" className={labelClassName}>
          Blog content
        </label>
        <input type="hidden" name="body" value={values.body} />
        <RichTextEditor
          value={values.body}
          onChange={(val) => updateField("body", val)}
          readOnly={contentReadOnly}
          placeholder="Write your article here. You can add screenshots below."
        />
        {showError("body") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.body}
          </p>
        )}
      </div>

      {post && post.images.length > 0 && (
        <div>
          <p className={labelClassName}>Screenshots & photos</p>
          <ul className="mt-2 space-y-4">
            {post.images.map((img) => (
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
                  {!contentReadOnly && (
                    <>
                      <input
                        type="checkbox"
                        name="removeImage"
                        value={img.id}
                        className="rounded border-border"
                      />
                      Remove this image
                    </>
                  )}
                  {contentReadOnly && <span className="text-muted">Image {img.sortOrder + 1}</span>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!contentReadOnly && (
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="images" className={labelClassName}>
              {post ? "Add more images" : "Screenshots & photos (optional)"}
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
            {post
              ? `You can add ${slotsLeft} more image${slotsLeft === 1 ? "" : "s"} (max ${MAX_BLOG_IMAGES} total).`
              : `Up to ${MAX_BLOG_IMAGES} images per post.`}
          </p>
        </div>
      )}

      {isTeacher ? (
        <p className="rounded-md bg-warning-bg px-4 py-3 text-sm text-warning-text">
          Your post will be sent to the admin for review. Once approved, it will appear on the public
          blog page.
        </p>
      ) : (
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
              <span className="font-medium">Publish on the public blog</span>
              <span className="mt-0.5 block text-muted">Leave unchecked to save as a draft.</span>
            </span>
          </label>
          <label
            className={`flex items-start gap-3 text-sm text-foreground ${
              canFeatureThisPost ? "cursor-pointer" : ""
            }`}
          >
            <input
              type="checkbox"
              name="featuredOnHomepage"
              defaultChecked={isCurrentlyFeatured}
              disabled={!canFeatureThisPost}
              className="mt-1 rounded border-border disabled:cursor-not-allowed"
            />
            <span>
              <span className="font-medium">Show on homepage</span>
              {canFeatureThisPost ? (
                <span className="mt-0.5 block text-muted">
                  Featured in the Featured Blogs section when published (up to{" "}
                  {HOMEPAGE_FEATURED_BLOGS_MAX}; {displayedFeaturedCount}/{HOMEPAGE_FEATURED_BLOGS_MAX}{" "}
                  slots used). All published posts still appear on the Blog page.
                </span>
              ) : (
                <span className="mt-0.5 block text-muted">
                  There are already {HOMEPAGE_FEATURED_BLOGS_MAX} featured blogs. Remove one blog from
                  the homepage to add this post as a featured blog.
                </span>
              )}
            </span>
          </label>
        </div>
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
