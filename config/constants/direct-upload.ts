/**
 * Direct-to-R2 uploads, shared by the browser and the server (no server-only
 * imports here). The browser asks /api/uploads for a presigned PUT, sends the
 * file straight to the bucket, and submits the returned key with the form;
 * the server checks the stored object before recording it
 * (services/direct-upload.ts).
 */

export const UPLOAD_KINDS = [
  "course-announcement-attachment",
  "blog-image",
  "site-announcement-image",
  "library-cover",
  "book-cover",
] as const;

export type UploadKind = (typeof UPLOAD_KINDS)[number];

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && (UPLOAD_KINDS as readonly string[]).includes(value);
}

export const DIRECT_UPLOAD_ENDPOINT = "/api/uploads";

/**
 * Files up to this size (all files of one form together) may still go
 * through the form itself when the direct upload fails, e.g. before the R2
 * CORS rule exists. Larger ones would hit Vercel's 4.5 MB request-body cap.
 */
export const FORM_UPLOAD_FALLBACK_MAX_BYTES = 4 * 1024 * 1024;

/** The form field that carries the staged keys for a file field, e.g. images → imagesKey. */
export function stagedKeyField(fileField: string): string {
  return `${fileField}Key`;
}

/** The form field that carries the original file name for a staged file (attachments keep it). */
export function stagedNameField(fileField: string): string {
  return `${fileField}KeyName`;
}
