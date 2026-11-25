import { randomUUID } from "node:crypto";
import type { Session } from "next-auth";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { UploadKind } from "@/config/constants/direct-upload";
import { isAdminSession } from "@/services/admin";
import {
  contentMismatchMessage,
  declaredUploadError,
  newObjectTarget,
  sniffMime,
  UploadError,
  type StoredMime,
} from "@/services/storage";
import { UPLOAD_KIND_DEFINITIONS } from "@/services/upload-kinds";
import { getTeacherForSession } from "@/services/teacher-auth";
import { getPrivateBucketName, getR2Client } from "@/utils/s3";
import { prisma } from "@/utils/prisma";

export { isUploadKind, UPLOAD_KINDS, type UploadKind } from "@/config/constants/direct-upload";

/**
 * Presigned direct-to-R2 uploads, so large files never pass through a
 * Vercel function (whose request body is capped at 4.5 MB).
 *
 *  1. createUploadUrl: a presigned PUT for a server-chosen staging key in the
 *     private bucket (staging/<kind>/<ownerId>/<uuid>). The signature covers
 *     the declared Content-Type and the exact Content-Length, which must be
 *     within the kind's limits, and expires after a few minutes.
 *  2. The browser PUTs the file and submits the key with the form.
 *  3. finalizeUpload: checks the key is the caller's, reads the object's size
 *     and type (HEAD) and its leading bytes (ranged GET), and only then copies
 *     it to its final place (the same keys the form upload uses). The staging
 *     object is always removed; a refused file never reaches its final place.
 *
 * Staging objects that are never submitted stay in the private bucket's
 * staging/ prefix; an R2 lifecycle rule on that prefix removes them.
 */

export const DIRECT_UPLOAD_URL_TTL_SECONDS = 5 * 60;

/** Bytes read to identify the file type (sniffMime needs 12). */
const SNIFF_BYTES = 32;

/**
 * Whether `session` may upload files of `kind`. Course attachments also need
 * the course: admins may post to any, a teacher only to their own course.
 */
export async function mayUploadKind(kind: UploadKind, session: Session | null, courseId?: string | null): Promise<boolean> {
  if (!session?.user?.id) return false;
  if (isAdminSession(session)) return true;
  const access = UPLOAD_KIND_DEFINITIONS[kind].access;
  if (access === "admin") return false;

  const teacher = await getTeacherForSession(session);
  if (!teacher) return false;
  if (access === "staff") return true;

  if (!courseId) return false;
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true } });
  return course?.teacherId === teacher.id;
}

const SAFE_OWNER_ID = /^[A-Za-z0-9_-]{1,64}$/;

function assertOwnerId(ownerId: string): void {
  if (!SAFE_OWNER_ID.test(ownerId)) throw new UploadError("The upload could not be authorised.");
}

function stagingPrefix(kind: UploadKind, ownerId: string): string {
  return `staging/${kind}/${ownerId}/`;
}

/** True when `key` is a staging key this owner was issued for this kind. */
export function isStagedKeyFor(kind: UploadKind, ownerId: string, key: string): boolean {
  if (!SAFE_OWNER_ID.test(ownerId) || typeof key !== "string") return false;
  const prefix = stagingPrefix(kind, ownerId);
  return key.startsWith(prefix) && /^[0-9a-f-]{36}$/.test(key.slice(prefix.length));
}

export type UploadTicket = {
  key: string;
  uploadUrl: string;
  /** Headers the PUT must carry exactly (they are part of the signature). */
  headers: { "Content-Type": string };
  expiresIn: number;
  maxBytes: number;
};

/**
 * A presigned PUT for one file. Throws UploadError (user-safe message) when
 * the declared type or size is not allowed for the kind.
 */
export async function createUploadUrl(
  kind: UploadKind,
  ownerId: string,
  file: { contentType: unknown; size: unknown },
): Promise<UploadTicket> {
  assertOwnerId(ownerId);
  const { rules } = UPLOAD_KIND_DEFINITIONS[kind];
  const contentType = typeof file.contentType === "string" ? file.contentType : "";
  const size = typeof file.size === "number" && Number.isSafeInteger(file.size) ? file.size : -1;
  if (size <= 0) throw new UploadError(`${rules.label ?? "File"} is empty.`);
  const error = declaredUploadError(contentType, size, rules);
  if (error) throw new UploadError(error);

  const key = `${stagingPrefix(kind, ownerId)}${randomUUID()}`;
  const uploadUrl = await getSignedUrl(
    getR2Client(),
    new PutObjectCommand({ Bucket: getPrivateBucketName(), Key: key, ContentType: contentType, ContentLength: size }),
    {
      expiresIn: DIRECT_UPLOAD_URL_TTL_SECONDS,
      // Sign both, so the URL cannot be used for another type or a larger body.
      signableHeaders: new Set(["content-type", "content-length"]),
    },
  );
  return { key, uploadUrl, headers: { "Content-Type": contentType }, expiresIn: DIRECT_UPLOAD_URL_TTL_SECONDS, maxBytes: rules.maxBytes };
}

async function deleteStaged(bucket: string, key: string): Promise<void> {
  try {
    await getR2Client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  } catch (error) {
    console.error(`[direct-upload] Failed to delete staged ${key}:`, error);
  }
}

export type FinalizedUpload = {
  /** What the app stores: the public URL, or the /api/files path for private kinds. */
  location: string;
  mime: StoredMime;
  size: number;
};

const NOT_FOUND_MESSAGE = "The uploaded file could not be found. Please choose it again.";

/**
 * Verifies a staged upload and moves it to its final key
 * (<uploads|private>/<prefix>/<idPrefix>-<unique>.<ext>). Throws UploadError
 * when the key is not the owner's, the object is missing, too large, empty,
 * or its bytes are not the allowed type it was declared as. The staging
 * object is deleted in every case once it has been looked at.
 */
export async function finalizeUpload(kind: UploadKind, key: string, ownerId: string, idPrefix: string): Promise<FinalizedUpload> {
  if (!isStagedKeyFor(kind, ownerId, key)) throw new UploadError(NOT_FOUND_MESSAGE);
  const { rules, visibility, prefix } = UPLOAD_KIND_DEFINITIONS[kind];
  const client = getR2Client();
  const stagingBucket = getPrivateBucketName();

  let head;
  try {
    head = await client.send(new HeadObjectCommand({ Bucket: stagingBucket, Key: key }));
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === "NotFound" || name === "NoSuchKey") throw new UploadError(NOT_FOUND_MESSAGE);
    throw error;
  }

  try {
    const size = head.ContentLength ?? 0;
    const declared = head.ContentType ?? "";
    if (size <= 0) throw new UploadError(`${rules.label ?? "File"} is empty.`);
    const declaredError = declaredUploadError(declared, size, rules);
    if (declaredError) throw new UploadError(declaredError);

    const start = await client.send(new GetObjectCommand({ Bucket: stagingBucket, Key: key, Range: `bytes=0-${SNIFF_BYTES - 1}` }));
    const bytes = start.Body ? Buffer.from(await start.Body.transformToByteArray()) : Buffer.alloc(0);
    const sniffed = sniffMime(bytes);
    if (!sniffed || sniffed !== declared || !(rules.allowed as readonly string[]).includes(sniffed)) {
      throw new UploadError(contentMismatchMessage(rules));
    }

    const target = newObjectTarget(visibility, prefix, idPrefix, sniffed);
    await client.send(
      new CopyObjectCommand({
        Bucket: target.bucket,
        Key: target.key,
        CopySource: `${stagingBucket}/${key}`,
        ContentType: sniffed,
        MetadataDirective: "REPLACE",
      }),
    );
    return { location: target.location, mime: sniffed, size };
  } finally {
    await deleteStaged(stagingBucket, key);
  }
}
