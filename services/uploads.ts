import { finalizeStagedUpload, isStagedUpload, pendingUploadFrom, pendingUploadsFrom, type PendingUpload } from "@/services/staged-upload";
import { deleteR2Object, ownedProfileImageKey, uploadPrivateToR2, uploadToR2, validateUpload } from "@/services/storage";
import { R2_BUCKET_NAME } from "@/utils/s3";
import { storedObjectOf, UPLOAD_KIND_DEFINITIONS, type StoredUploadKind } from "@/services/upload-kinds";
import type { UploadKind } from "@/config/constants/direct-upload";

/**
 * Saving, checking and deleting stored files by kind (the table is in
 * services/upload-kinds.ts). Replaces one wrapper module per kind.
 */

/**
 * Declared type and size of a form file. A staged upload is checked when it
 * is finalised; `requireFile` refuses an empty file (multi-image fields).
 */
export function validatePendingUpload(
  kind: StoredUploadKind,
  upload: PendingUpload | null | undefined,
  options: { requireFile?: boolean } = {},
): { error?: string } {
  if (isStagedUpload(upload)) return {};
  if (options.requireFile && (!upload || upload.size === 0)) return { error: "Empty file." };
  return validateUpload(upload, UPLOAD_KIND_DEFINITIONS[kind].rules);
}

/** Every upload of `kind` a form submits in `field`: files (form upload) and staged keys (direct upload). */
export function pendingUploadsOf(kind: UploadKind, formData: FormData, field: string): PendingUpload[] {
  return pendingUploadsFrom(formData, field, kind);
}

/** The single upload of `kind` in `field`, or null. */
export function pendingUploadOf(kind: UploadKind, formData: FormData, field: string): PendingUpload | null {
  return pendingUploadFrom(formData, field, kind);
}

/**
 * Stores a file of `kind` (bytes are sniffed; a staged upload is verified and
 * moved) as <uploads|private>/<prefix>/<idPrefix>-<unique>.<ext>. Returns
 * what the app records: the public URL, or the /api/files path. Throws
 * UploadError when the file is refused.
 */
export async function saveUpload(kind: StoredUploadKind, idPrefix: string, upload: PendingUpload): Promise<string> {
  // A staged upload carries the kind of the form field it came from.
  if (isStagedUpload(upload)) return (await finalizeStagedUpload(upload, idPrefix)).location;
  const { visibility, prefix, rules } = UPLOAD_KIND_DEFINITIONS[kind];
  return visibility === "private"
    ? uploadPrivateToR2(prefix, idPrefix, upload, rules)
    : uploadToR2(prefix, idPrefix, upload, rules);
}

/**
 * Deletes a stored file of `kind` (best effort, never throws). Anything that
 * is not one of that kind's objects (another kind's folder, a URL that is
 * not ours, the other visibility) is left alone.
 */
export function deleteUpload(kind: StoredUploadKind, urlOrPath: string | null | undefined): Promise<void> {
  return deleteR2Object(storedObjectOf(kind, urlOrPath));
}

export async function deleteUploads(kind: StoredUploadKind, urls: Array<string | null | undefined>): Promise<void> {
  await Promise.all(urls.map((url) => deleteUpload(kind, url)));
}

/**
 * Deletes `userId`'s own uploaded photo. Anything else (a default avatar, a
 * Google photo, another user's upload stored on this profile) is left alone.
 */
export async function deleteOwnedProfileImage(userId: string, imagePath: string | null | undefined): Promise<void> {
  const key = ownedProfileImageKey(userId, imagePath);
  if (!key) return;
  await deleteR2Object({ bucket: R2_BUCKET_NAME, key });
}

/** The name an attachment keeps for downloads: its original name, made safe for a header. */
export function attachmentNameOf(upload: PendingUpload): string {
  const base = (upload.name ?? "").replace(/[/\?%*:|"<>]/g, "_").trim();
  return base.slice(0, 120) || "attachment";
}
