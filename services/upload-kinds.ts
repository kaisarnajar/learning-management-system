import type { UploadKind } from "@/config/constants/direct-upload";
import { FILE_CONFIG } from "@/config/constants/file";
import { ANNOUNCEMENT_MAX_UPLOAD_BYTES } from "@/services/announcements";
import { MAX_BLOG_IMAGE_BYTES } from "@/services/blog-limits";
import {
  ATTACHMENT_MIMES,
  IMAGE_MIMES,
  r2KeyFromUrl,
  type StoragePrefix,
  type StorageVisibility,
  type UploadRules,
} from "@/services/storage";

/**
 * Every kind of file the app stores, in one table: its limits, whether it is
 * public (uploads/, served by URL) or private (private/, served through
 * /api/files), and the folder it lives in. The operations on stored files
 * are in services/uploads.ts; presigned direct uploads in
 * services/direct-upload.ts.
 */

/** Kinds that can also be sent straight to R2 (UPLOAD_KINDS), plus the form-only ones. */
export type StoredUploadKind = UploadKind | "profile-image" | "payment-screenshot";

/** admin: admins only; staff: admins and teachers; course: admins and the course's teacher. */
export type UploadKindAccess = "admin" | "staff" | "course";

export type UploadKindDefinition = {
  rules: UploadRules;
  visibility: StorageVisibility;
  /** Where new files go. */
  prefix: StoragePrefix;
  /**
   * Folders that older files of this kind were stored in (same visibility).
   * They stay valid for deleting; the stored URLs keep working as they are.
   */
  legacyPrefixes?: readonly StoragePrefix[];
};

export type DirectUploadKindDefinition = UploadKindDefinition & { access: UploadKindAccess };

export const UPLOAD_KIND_DEFINITIONS: { [K in StoredUploadKind]: K extends UploadKind ? DirectUploadKindDefinition : UploadKindDefinition } = {
  "course-announcement-attachment": {
    rules: { allowed: ATTACHMENT_MIMES, maxBytes: ANNOUNCEMENT_MAX_UPLOAD_BYTES, label: "Attachment" },
    visibility: "private",
    prefix: "announcements",
    access: "course",
  },
  "blog-image": {
    rules: { allowed: IMAGE_MIMES, maxBytes: MAX_BLOG_IMAGE_BYTES, label: "Each image" },
    visibility: "public",
    prefix: "blogs",
    access: "staff",
  },
  "site-announcement-image": {
    rules: { allowed: IMAGE_MIMES, maxBytes: FILE_CONFIG.MAX_IMAGE_SIZE_BYTES, label: "Each image" },
    visibility: "public",
    // Stored under uploads/announcements/ until 2026-11, the same folder name
    // as the private course-announcement attachments.
    prefix: "site-announcements",
    legacyPrefixes: ["announcements"],
    access: "admin",
  },
  "library-cover": {
    rules: { allowed: IMAGE_MIMES, maxBytes: FILE_CONFIG.MAX_AVATAR_SIZE_BYTES, label: "Image" },
    visibility: "public",
    prefix: "library",
    access: "admin",
  },
  "book-cover": {
    rules: { allowed: IMAGE_MIMES, maxBytes: FILE_CONFIG.MAX_AVATAR_SIZE_BYTES, label: "Image" },
    visibility: "public",
    prefix: "books",
    access: "admin",
  },
  "profile-image": {
    rules: { allowed: IMAGE_MIMES, maxBytes: FILE_CONFIG.MAX_AVATAR_SIZE_BYTES, label: "Image" },
    visibility: "public",
    prefix: "profiles",
  },
  "payment-screenshot": {
    rules: { allowed: IMAGE_MIMES, maxBytes: FILE_CONFIG.MAX_AVATAR_SIZE_BYTES, label: "Screenshot" },
    visibility: "private",
    prefix: "payments",
  },
};

/**
 * The bucket and key of a stored file of `kind`, or null when the URL/path is
 * not ours, not of that visibility, or outside the kind's current and legacy
 * folders. Only such objects are ever deleted for that kind.
 */
export function storedObjectOf(kind: StoredUploadKind, urlOrPath: string | null | undefined): { bucket: string; key: string } | null {
  const { visibility, prefix, legacyPrefixes = [] } = UPLOAD_KIND_DEFINITIONS[kind];
  for (const folder of [prefix, ...legacyPrefixes]) {
    const target = r2KeyFromUrl(folder, urlOrPath, visibility);
    if (target) return target;
  }
  return null;
}
