import { NextResponse } from "next/server";

/**
 * Response helpers for the mobile API (/api/v1). Every error has the shape
 * `{ success: false, error }` so the app can show `error` as is.
 */
export function apiError(error: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

/** Logs the cause server-side and answers with a generic 500. */
export function apiServerError(scope: string, cause: unknown, message: string): NextResponse {
  console.error(`[${scope}]`, cause);
  return apiError(message, 500);
}

/** Reads a JSON body, or null when it is missing or malformed. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const body = await request.json().catch(() => null);
  return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}
