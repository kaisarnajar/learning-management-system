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

/**
 * Edge caching for public content (home, lists and details of published
 * items). An anonymous request (no Authorization header) gets a response the
 * CDN may keep for a minute and serve stale for five more while it refetches;
 * admin edits therefore show up on the apps within about a minute. A request
 * with a Bearer token may be personalised (e.g. `likedByMe`, the caller's
 * enrollment), so its response is never stored. `Vary: Authorization` keeps
 * the two apart in any cache that would otherwise ignore the difference.
 */
export const PUBLIC_EDGE_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

export function publicJson(request: Request, body: unknown, init: ResponseInit = {}): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set(
    "Cache-Control",
    request.headers.has("authorization") ? "private, no-store" : PUBLIC_EDGE_CACHE_CONTROL,
  );
  response.headers.append("Vary", "Authorization");
  return response;
}
