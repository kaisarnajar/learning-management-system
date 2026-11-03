import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { r2Client, R2_BUCKET_NAME, R2_PUBLIC_URL } from "@/utils/s3";

/**
 * The one place that talks to R2 for uploads.
 *
 * Every upload is checked twice: the declared type and size up front
 * (validateUpload, synchronous, for early form feedback) and the actual bytes
 * at upload time (sniffMime): a file whose content does not match its
 * declared type is refused, so a script renamed to .png never lands in the
 * bucket under an image content type.
 */

export type StoredMime =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | "application/pdf"
  | "application/msword"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const IMAGE_MIMES: readonly StoredMime[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const ATTACHMENT_MIMES: readonly StoredMime[] = [
  "application/pdf",
  ...IMAGE_MIMES,
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const EXT_BY_MIME: Record<StoredMime, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

/** Folder under uploads/ that a kind of file lives in. */
export type StoragePrefix = "blogs" | "library" | "books" | "announcements" | "profiles" | "payments";

/** A problem with a file the user chose; the message is safe to show. */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

export function isUploadError(error: unknown): error is UploadError {
  return error instanceof UploadError;
}

/** Detects the real type from the leading bytes; null when it is none of the stored kinds. */
export function sniffMime(buffer: Buffer): StoredMime | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  const ascii6 = buffer.toString("ascii", 0, 6);
  if (ascii6 === "GIF87a" || ascii6 === "GIF89a") return "image/gif";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (buffer.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
  // OLE compound document (legacy .doc)
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) return "application/msword";
  // ZIP container: .docx is a zip, so the declared type decides between docx and "not allowed".
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  return null;
}

export type UploadRules = {
  allowed: readonly StoredMime[];
  maxBytes: number;
  /** Used in messages, e.g. "Image" or "Attachment". */
  label?: string;
};

function describeAllowed(allowed: readonly StoredMime[]): string {
  const names = allowed.map((mime) => EXT_BY_MIME[mime].toUpperCase().replace("JPG", "JPEG"));
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}` : names[0];
}

function describeSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))} MB` : `${Math.round(bytes / 1024)} KB`;
}

/** Declared type and size check for early form feedback (no bytes read). */
export function validateUpload(file: File | null | undefined, rules: UploadRules): { error?: string } {
  if (!file || file.size === 0) return {};
  const label = rules.label ?? "File";
  if (!(rules.allowed as readonly string[]).includes(file.type)) {
    return { error: `${label} must be ${describeAllowed(rules.allowed)}.` };
  }
  if (file.size > rules.maxBytes) {
    return { error: `${label} must be ${describeSize(rules.maxBytes)} or smaller.` };
  }
  return {};
}

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Validates (declared and sniffed) and stores a file under
 * uploads/<prefix>/<idPrefix>-<unique>.<ext>. Returns the public URL.
 * Throws UploadError with a user-safe message when the file is refused.
 */
export async function uploadToR2(prefix: StoragePrefix, idPrefix: string, file: File, rules: UploadRules): Promise<string> {
  const declared = validateUpload(file, rules);
  if (declared.error) throw new UploadError(declared.error);
  if (!file || file.size === 0) throw new UploadError(`${rules.label ?? "File"} is empty.`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buffer);
  if (!sniffed || !(rules.allowed as readonly string[]).includes(sniffed) || sniffed !== file.type) {
    throw new UploadError(`${rules.label ?? "File"} content does not match its type. Upload ${describeAllowed(rules.allowed)}.`);
  }

  const key = `uploads/${prefix}/${idPrefix}-${randomSuffix()}.${EXT_BY_MIME[sniffed]}`;
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: sniffed,
    }),
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

/** The object key for a stored URL/path, or null when it is not ours (or not under the prefix). */
export function r2KeyFromUrl(prefix: StoragePrefix, urlOrPath: string | null | undefined): string | null {
  if (!urlOrPath) return null;
  let key = urlOrPath;
  if (R2_PUBLIC_URL && key.startsWith(R2_PUBLIC_URL)) key = key.slice(R2_PUBLIC_URL.length);
  key = key.replace(/^\/+/, "");
  return key.startsWith(`uploads/${prefix}/`) ? key : null;
}

/** Best-effort delete; never throws (a leftover object is logged, not fatal). */
export async function deleteFromR2(prefix: StoragePrefix, urlOrPath: string | null | undefined): Promise<void> {
  const key = r2KeyFromUrl(prefix, urlOrPath);
  if (!key) return;
  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key }));
  } catch (error) {
    console.error(`[storage] Failed to delete ${key} from R2:`, error);
  }
}

/** Deletes several objects, best effort, in parallel. */
export async function deleteManyFromR2(prefix: StoragePrefix, urls: Array<string | null | undefined>): Promise<void> {
  await Promise.all(urls.map((url) => deleteFromR2(prefix, url)));
}
