import {
  DIRECT_UPLOAD_ENDPOINT,
  FORM_UPLOAD_FALLBACK_MAX_BYTES,
  stagedKeyField,
  stagedNameField,
  type UploadKind,
} from "@/config/constants/direct-upload";

/**
 * Browser side of direct-to-R2 uploads (services/direct-upload.ts). Before a
 * form is submitted, each chosen file is PUT straight to R2 with a presigned
 * URL from /api/uploads, and the form then carries the staging keys
 * (`<field>Key`, `<field>KeyName`) instead of the files, so the request stays
 * far below Vercel's 4.5 MB body cap.
 *
 * Fallback: when the direct upload cannot reach R2 (a network or CORS
 * failure, e.g. before the bucket's CORS rule exists, or an R2 error) and the
 * form's files total at most FORM_UPLOAD_FALLBACK_MAX_BYTES, the files are
 * left in the form and go through the server action as before. A file the
 * server refuses (type, size, permission) is never retried that way: the form
 * upload would refuse it too.
 */

export type DirectUploadField = {
  /** The file input's name, e.g. "images". */
  field: string;
  kind: UploadKind;
  /** Course attachments: the course the file is for. */
  courseId?: string;
};

export type PrepareResult = { ok: true; mode: "none" | "direct" | "form" } | { ok: false; error: string };

type Fetch = typeof fetch;

/** The server refused the file: show its message, do not fall back. */
class RefusedError extends Error {}

function describeSize(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

async function uploadOne(file: File, target: DirectUploadField, fetchImpl: Fetch): Promise<string> {
  const ticketResponse = await fetchImpl(DIRECT_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ kind: target.kind, contentType: file.type, size: file.size, courseId: target.courseId }),
  });
  const ticket = (await ticketResponse.json().catch(() => null)) as
    | { key?: string; uploadUrl?: string; headers?: Record<string, string>; error?: string }
    | null;
  if (ticketResponse.status >= 400 && ticketResponse.status < 500) {
    throw new RefusedError(ticket?.error ?? "This file cannot be uploaded.");
  }
  if (!ticketResponse.ok || !ticket?.key || !ticket.uploadUrl) {
    throw new Error(`Upload URL request failed (${ticketResponse.status}).`);
  }

  // A CORS or network failure rejects here; an R2 error answers non-2xx.
  const put = await fetchImpl(ticket.uploadUrl, { method: "PUT", headers: ticket.headers ?? { "Content-Type": file.type }, body: file });
  if (!put.ok) throw new Error(`Upload failed (${put.status}).`);
  return ticket.key;
}

/**
 * Uploads the files of `fields` straight to R2 and rewrites `formData` to
 * carry their keys. On a transport failure the files stay in the form when
 * they are small enough for it; otherwise the result is an error to show.
 */
export async function prepareDirectUploads(
  formData: FormData,
  fields: readonly DirectUploadField[],
  fetchImpl: Fetch = fetch,
): Promise<PrepareResult> {
  const chosen = fields.map((target) => ({
    target,
    files: formData.getAll(target.field).filter((value): value is File => value instanceof File && value.size > 0),
  }));
  const totalBytes = chosen.reduce((sum, { files }) => sum + files.reduce((s, file) => s + file.size, 0), 0);
  if (totalBytes === 0) return { ok: true, mode: "none" };

  const uploaded: Array<{ field: string; keys: Array<{ key: string; name: string }> }> = [];
  try {
    for (const { target, files } of chosen) {
      const keys: Array<{ key: string; name: string }> = [];
      for (const file of files) keys.push({ key: await uploadOne(file, target, fetchImpl), name: file.name });
      uploaded.push({ field: target.field, keys });
    }
  } catch (error) {
    if (error instanceof RefusedError) return { ok: false, error: error.message };
    console.warn("[upload] Direct upload failed:", error);
    if (totalBytes <= FORM_UPLOAD_FALLBACK_MAX_BYTES) return { ok: true, mode: "form" };
    return {
      ok: false,
      error: `The upload could not be completed. Files over ${describeSize(FORM_UPLOAD_FALLBACK_MAX_BYTES)} in total need a working connection to the file store; please try again in a moment.`,
    };
  }

  for (const { field, keys } of uploaded) {
    formData.delete(field);
    for (const { key, name } of keys) {
      formData.append(stagedKeyField(field), key);
      formData.append(stagedNameField(field), name);
    }
  }
  return { ok: true, mode: "direct" };
}
