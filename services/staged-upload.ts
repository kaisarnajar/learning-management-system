import { stagedKeyField, stagedNameField, type UploadKind } from "@/config/constants/direct-upload";
import { finalizeUpload, type FinalizedUpload } from "@/services/direct-upload";
import { UploadError } from "@/services/storage";

/**
 * A file the browser already sent straight to R2 (services/direct-upload.ts):
 * the form carries its staging key in `<field>Key` (and, for attachments, its
 * original name in `<field>KeyName`) instead of the file itself. The kind is
 * decided by the server from the field, never by the form.
 */
export type StagedUpload = { staged: true; kind: UploadKind; key: string; name: string | null };

/** What a form field may carry: the file itself (form upload, mobile API) or a staged key. */
export type PendingUpload = File | StagedUpload;

export function isStagedUpload(upload: PendingUpload | null | undefined): upload is StagedUpload {
  return Boolean(upload && (upload as StagedUpload).staged === true);
}

/** Every upload in `field`: non-empty files first, then staged keys (in form order). */
export function pendingUploadsFrom(formData: FormData, field: string, kind: UploadKind): PendingUpload[] {
  const files = formData.getAll(field).filter((value): value is File => value instanceof File && value.size > 0);
  const names = formData.getAll(stagedNameField(field)).map((value) => (typeof value === "string" ? value : null));
  const staged = formData
    .getAll(stagedKeyField(field))
    .map((value, index) => ({ value, name: names[index] ?? null }))
    .filter((entry): entry is { value: string; name: string | null } => typeof entry.value === "string" && entry.value.length > 0)
    .map(({ value, name }): StagedUpload => ({ staged: true, kind, key: value, name }));
  return [...files, ...staged];
}

/** The single upload in `field`, or null. */
export function pendingUploadFrom(formData: FormData, field: string, kind: UploadKind): PendingUpload | null {
  return pendingUploadsFrom(formData, field, kind)[0] ?? null;
}

/**
 * Verifies a staged upload of the signed-in user and moves it to its final
 * key; throws UploadError when it is not theirs or the file is refused.
 */
export async function finalizeStagedUpload(upload: StagedUpload, idPrefix: string): Promise<FinalizedUpload> {
  // Loaded here, not at the top: services/uploads.ts (and so every module
  // that stores a file, e.g. book orders) imports this file, and only this
  // function needs the session.
  const { auth } = await import("@/services/auth");
  const session = await auth();
  const ownerId = session?.user?.id;
  if (!ownerId) throw new UploadError("Sign in again to upload this file.");
  return finalizeUpload(upload.kind, upload.key, ownerId, idPrefix);
}
