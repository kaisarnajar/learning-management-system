import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2Client, R2_BUCKET_NAME, R2_PRIVATE_BUCKET_NAME, R2_PUBLIC_URL } from "@/utils/s3";

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

/** Folder under uploads/ (or private/) that a kind of file lives in. */
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

/** Reads and checks the bytes; returns the buffer and the verified type or throws UploadError. */
async function readVerified(file: File, rules: UploadRules): Promise<{ buffer: Buffer; mime: StoredMime }> {
  const declared = validateUpload(file, rules);
  if (declared.error) throw new UploadError(declared.error);
  if (!file || file.size === 0) throw new UploadError(`${rules.label ?? "File"} is empty.`);

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffMime(buffer);
  if (!sniffed || !(rules.allowed as readonly string[]).includes(sniffed) || sniffed !== file.type) {
    throw new UploadError(`${rules.label ?? "File"} content does not match its type. Upload ${describeAllowed(rules.allowed)}.`);
  }
  return { buffer, mime: sniffed };
}

/**
 * Validates (declared and sniffed) and stores a public file under
 * uploads/<prefix>/<idPrefix>-<unique>.<ext>. Returns the public URL.
 * Throws UploadError with a user-safe message when the file is refused.
 */
export async function uploadToR2(prefix: StoragePrefix, idPrefix: string, file: File, rules: UploadRules): Promise<string> {
  const { buffer, mime } = await readVerified(file, rules);
  const key = `uploads/${prefix}/${idPrefix}-${randomSuffix()}.${EXT_BY_MIME[mime]}`;
  await r2Client.send(
    new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: key, Body: buffer, ContentType: mime }),
  );
  return `${R2_PUBLIC_URL}/${key}`;
}

// ---------------------------------------------------------------------------
// Private objects: served through /api/files/<key>, which checks ownership
// and redirects to a short-lived presigned URL. They live in
// R2_PRIVATE_BUCKET_NAME when set (a bucket without public access), else
// under the private/ prefix of the main bucket, where the random object
// names are the only protection, so set the private bucket in production.
// ---------------------------------------------------------------------------

export const PRIVATE_FILE_ROUTE = "/api/files/";
export const PRIVATE_URL_TTL_SECONDS = 5 * 60;

export function isPrivateFilePath(path: string | null | undefined): boolean {
  return Boolean(path && path.startsWith(PRIVATE_FILE_ROUTE));
}

/** The private object key for an app path (/api/files/private/<prefix>/<object>), or null. */
export function privateKeyFromPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith(PRIVATE_FILE_ROUTE)) return null;
  const key = path.slice(PRIVATE_FILE_ROUTE.length).replace(/^\/+/, "");
  if (!/^private\/[a-z]+\/[A-Za-z0-9._-]+$/.test(key)) return null;
  return key;
}

/** Stores a file privately and returns the app path it is served from. */
export async function uploadPrivateToR2(prefix: StoragePrefix, idPrefix: string, file: File, rules: UploadRules): Promise<string> {
  const { buffer, mime } = await readVerified(file, rules);
  const key = `private/${prefix}/${idPrefix}-${randomSuffix()}.${EXT_BY_MIME[mime]}`;
  await r2Client.send(
    new PutObjectCommand({ Bucket: R2_PRIVATE_BUCKET_NAME, Key: key, Body: buffer, ContentType: mime }),
  );
  return `${PRIVATE_FILE_ROUTE}${key}`;
}

/** A presigned GET for a private key, valid for PRIVATE_URL_TTL_SECONDS. */
export function presignPrivateObject(key: string, downloadName?: string): Promise<string> {
  const safeName = downloadName?.replace(/["\\\r\n]/g, "_");
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_PRIVATE_BUCKET_NAME,
      Key: key,
      ...(safeName ? { ResponseContentDisposition: `inline; filename="${safeName}"` } : {}),
    }),
    { expiresIn: PRIVATE_URL_TTL_SECONDS },
  );
}

/** The bucket and key for a stored URL/path, or null when it is not ours (or not under the prefix). */
export function r2KeyFromUrl(prefix: StoragePrefix, urlOrPath: string | null | undefined): { bucket: string; key: string } | null {
  if (!urlOrPath) return null;
  const privateKey = privateKeyFromPath(urlOrPath);
  if (privateKey) {
    return privateKey.startsWith(`private/${prefix}/`) ? { bucket: R2_PRIVATE_BUCKET_NAME, key: privateKey } : null;
  }
  let key = urlOrPath;
  if (R2_PUBLIC_URL && key.startsWith(R2_PUBLIC_URL)) key = key.slice(R2_PUBLIC_URL.length);
  key = key.replace(/^\/+/, "");
  return key.startsWith(`uploads/${prefix}/`) ? { bucket: R2_BUCKET_NAME, key } : null;
}

/** Best-effort delete; never throws (a leftover object is logged, not fatal). */
export async function deleteFromR2(prefix: StoragePrefix, urlOrPath: string | null | undefined): Promise<void> {
  const target = r2KeyFromUrl(prefix, urlOrPath);
  if (!target) return;
  try {
    await r2Client.send(new DeleteObjectCommand({ Bucket: target.bucket, Key: target.key }));
  } catch (error) {
    console.error(`[storage] Failed to delete ${target.key} from R2:`, error);
  }
}

/** Deletes several objects, best effort, in parallel. */
export async function deleteManyFromR2(prefix: StoragePrefix, urls: Array<string | null | undefined>): Promise<void> {
  await Promise.all(urls.map((url) => deleteFromR2(prefix, url)));
}
