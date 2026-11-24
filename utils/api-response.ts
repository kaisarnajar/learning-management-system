import { NextResponse } from "next/server";

/**
 * Response helpers for every route handler under app/api. Every error has the
 * shape `{ success: false, error }` (plus optional extra fields such as
 * `code`), so the mobile app and the website can show `error` as is.
 */
export function apiError(
  error: string,
  status: number,
  init: { extra?: Record<string, unknown>; headers?: HeadersInit } = {},
): NextResponse {
  return NextResponse.json({ success: false, error, ...init.extra }, { status, headers: init.headers });
}

/** Logs the cause server-side and answers with a generic 500. */
export function apiServerError(scope: string, cause: unknown, message: string): NextResponse {
  console.error(`[${scope}]`, cause);
  return apiError(message, 500);
}

/** The 400 answer for a body that is missing, malformed or not a JSON object. */
export const INVALID_JSON_MESSAGE = "The request body must be a JSON object.";

/** Reads a JSON body, or null when it is missing or malformed. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}
