import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { createUploadUrl, isUploadKind, mayUploadKind } from "@/services/direct-upload";
import { enforceRateLimit, RATE_LIMIT_MESSAGE, RATE_LIMITS } from "@/services/rate-limit";
import { isUploadError } from "@/services/storage";

/**
 * A presigned PUT for one file the website's forms upload straight to R2
 * (services/direct-upload.ts). Browser session only.
 *
 * Body: { kind, contentType, size, courseId? } (courseId for course attachments).
 * 200 { success, key, uploadUrl, headers, expiresIn, maxBytes }; 400 for an
 * unknown kind or a type/size the kind refuses; 401 signed out; 403 when the
 * caller may not upload that kind (or to that course); 415 not JSON; 429 rate limited.
 */
export const dynamic = "force-dynamic";

function error(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return error("Unauthorized.", 401);

  // JSON only: a cross-site form cannot send it without a CORS preflight.
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return error("Send the request as JSON.", 415);
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = body?.kind;
  if (!isUploadKind(kind)) return error("Unknown upload kind.", 400);

  const courseId = typeof body?.courseId === "string" ? body.courseId : null;
  try {
    if (!(await mayUploadKind(kind, session, courseId))) return error("You cannot upload this file.", 403);

    const limited = await enforceRateLimit(RATE_LIMITS.DIRECT_UPLOAD_USER, userId, { success: false, error: RATE_LIMIT_MESSAGE });
    if (limited) return limited;

    const ticket = await createUploadUrl(kind, userId, { contentType: body?.contentType, size: body?.size });
    return NextResponse.json({ success: true, ...ticket });
  } catch (caught) {
    if (isUploadError(caught)) return error(caught.message, 400);
    console.error("[api/uploads] POST Error:", caught);
    return error("Failed to prepare the upload.", 500);
  }
}
