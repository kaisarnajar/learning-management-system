import type { Session } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { getURLFromRedirectError } from "next/dist/client/components/redirect";
import {
  getAccessFallbackHTTPStatus,
  isHTTPAccessFallbackError,
} from "next/dist/client/components/http-access-fallback/http-access-fallback";
import { authenticateApiRequest, type ApiUserPayload } from "@/services/api-auth";
import { runAsApiActor } from "@/services/api-actor";
import { getTeacherForSession } from "@/services/teacher-auth";
import { parseApiPagination } from "@/utils/api-pagination";
import { readFlash } from "@/utils/flash";

/**
 * Staff side of the mobile API: /api/v1/admin/** for admins and developers,
 * /api/v1/teacher/** for teachers.
 *
 * Reads call the same service functions the admin and teacher pages use.
 * Payments, coupons and book orders call their services directly
 * (`staffServiceAction`), which return typed results. The other writes still
 * call the website's own server actions (`staffAction`), run as the app user
 * (see services/api-actor.ts), so validation, audit log, e-mails and cache
 * invalidation stay in one place. A server action reports its outcome by
 * returning `{ error }` / `{ success }` or by redirecting with a flash
 * (`?err=` / `?msg=` / `?error=`); both are turned into JSON here. As those
 * actions move into services, they move to `staffServiceAction`.
 */

export const ADMIN_ROLES = ["ADMIN", "DEVELOPER"] as const;
export const TEACHER_ROLES = ["TEACHER"] as const;
export type StaffRole = (typeof ADMIN_ROLES)[number] | (typeof TEACHER_ROLES)[number];

export type StaffContext = {
  user: ApiUserPayload;
  session: Session;
  /** The teacher profile id, for teachers. */
  teacherId: string | null;
  request: NextRequest;
};

type StaffAuthResult = { ctx: StaffContext; errorResponse: null } | { ctx: null; errorResponse: NextResponse };

function fail(error: string, status: number): NextResponse {
  return NextResponse.json({ success: false, error }, { status });
}

/** Verifies the Bearer token and that the user has one of [roles]. */
export async function requireStaffApiAuth(request: NextRequest, roles: readonly StaffRole[]): Promise<StaffAuthResult> {
  const { user, error } = await authenticateApiRequest(request);
  if (!user) return { ctx: null, errorResponse: fail(error || "Unauthorized access", 401) };
  // authenticateApiRequest already resolves an unverified account to USER;
  // refuse here too so a staff route never runs for an unproven address.
  if (!user.emailVerified) return { ctx: null, errorResponse: fail("You do not have access to this.", 403) };
  if (!roles.includes(user.role as StaffRole)) {
    return { ctx: null, errorResponse: fail("You do not have access to this.", 403) };
  }

  const session: Session = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role as StaffRole,
      emailVerified: user.emailVerified ? new Date() : null,
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };

  let teacherId: string | null = null;
  if (user.role === "TEACHER") {
    const teacher = await getTeacherForSession(session);
    if (!teacher) return { ctx: null, errorResponse: fail("No teacher profile is linked to this account.", 403) };
    teacherId = teacher.id;
    session.user.teacherId = teacher.id;
  }

  return { ctx: { user, session, teacherId, request }, errorResponse: null };
}

/** Maps an error thrown by page or action code to a JSON response, or null when it is not one Next.js uses for control flow. */
function controlFlowResponse(error: unknown): NextResponse | null {
  if (isRedirectError(error)) return redirectResponse(getURLFromRedirectError(error));
  if (isHTTPAccessFallbackError(error)) {
    const status = getAccessFallbackHTTPStatus(error);
    return fail(status === 404 ? "This record no longer exists." : "You do not have access to this.", status);
  }
  return null;
}

/** A server action redirected: an error flash becomes a 400, anything else is success. */
function redirectResponse(url: string): NextResponse {
  const parsed = new URL(url, "http://local");
  if (parsed.pathname === "/login") return fail("Unauthorized: Session has ended. Sign in again.", 401);
  const params = parsed.searchParams;
  const flash = readFlash({ err: params.get("err") ?? undefined, msg: params.get("msg") ?? undefined });
  const error = flash ?? params.get("error");
  if (error) return fail(error, 400);
  return NextResponse.json({ success: true, redirect: `${parsed.pathname}${parsed.search}` });
}

/**
 * GET handler body for staff reads. [load] returns the JSON body (without
 * `success`); it runs as the app user, so services that read the session
 * themselves work too.
 */
export async function staffRead(
  request: NextRequest,
  roles: readonly StaffRole[],
  scope: string,
  load: (ctx: StaffContext) => Promise<Record<string, unknown> | NextResponse>,
): Promise<NextResponse> {
  const { ctx, errorResponse } = await requireStaffApiAuth(request, roles);
  if (errorResponse) return errorResponse;
  try {
    const body = await runAsApiActor(ctx.session, () => load(ctx));
    if (body instanceof NextResponse) return body;
    return NextResponse.json({ success: true, ...body });
  } catch (error) {
    const handled = controlFlowResponse(error);
    if (handled) return handled;
    console.error(`[${scope}]`, error);
    return fail("Something went wrong. Please try again.", 500);
  }
}

/**
 * POST/PATCH/DELETE handler body that runs a website server action for the
 * app. [run] calls the action; its return value is interpreted:
 *  - `{ error: "..." }` (non-empty) → 400 with that message;
 *  - a redirect with an error flash → 400 with the flash's message;
 *  - anything else → `{ success: true, result, redirect? }`.
 */
export async function staffAction(
  request: NextRequest,
  roles: readonly StaffRole[],
  scope: string,
  run: (ctx: StaffContext) => Promise<unknown>,
): Promise<NextResponse> {
  const { ctx, errorResponse } = await requireStaffApiAuth(request, roles);
  if (errorResponse) return errorResponse;
  try {
    const result = await runAsApiActor(ctx.session, () => run(ctx));
    if (result instanceof NextResponse) return result;
    if (result && typeof result === "object") {
      const error = (result as { error?: unknown }).error;
      if (typeof error === "string" && error.trim()) return fail(error, 400);
      if ((result as { success?: unknown }).success === false) {
        const message = (result as { message?: unknown }).message;
        return fail(typeof message === "string" && message ? message : "Something went wrong. Please try again.", 400);
      }
    }
    return NextResponse.json({ success: true, result: result ?? null });
  } catch (error) {
    const handled = controlFlowResponse(error);
    if (handled) return handled;
    console.error(`[${scope}]`, error);
    return fail("Something went wrong. Please try again.", 500);
  }
}

/** The typed result services/* return for a write (payment-approval, coupon-admin-actions, book-order-transitions). */
type ServiceResult = { ok: true } | { ok: false; error: string; status: number };

/**
 * POST/PATCH/DELETE handler body that calls a service directly. [run] returns
 * the service's typed result; a refusal becomes a 400 with its message (the
 * status installed apps have always seen for a refused staff action), and
 * [respond] gives the success body (without `success`). The route revalidates
 * the website's caches in [respond], as the website's own action does.
 */
export async function staffServiceAction<R extends ServiceResult>(
  request: NextRequest,
  roles: readonly StaffRole[],
  scope: string,
  run: (ctx: StaffContext) => Promise<R>,
  respond: (result: Extract<R, { ok: true }>, ctx: StaffContext) => Record<string, unknown>,
): Promise<NextResponse> {
  const { ctx, errorResponse } = await requireStaffApiAuth(request, roles);
  if (errorResponse) return errorResponse;
  try {
    const result = await runAsApiActor(ctx.session, () => run(ctx));
    if (!result.ok) return fail((result as Extract<R, { ok: false }>).error, 400);
    return NextResponse.json({ success: true, ...respond(result as Extract<R, { ok: true }>, ctx) });
  } catch (error) {
    const handled = controlFlowResponse(error);
    if (handled) return handled;
    console.error(`[${scope}]`, error);
    return fail("Something went wrong. Please try again.", 500);
  }
}

/**
 * The request body as FormData, the shape server actions take. Multipart and
 * URL-encoded bodies are used as they are; a JSON object is converted:
 * strings and numbers as text, `true` as "on" (a ticked checkbox), `false`
 * and null left out (an unticked one), arrays as repeated fields.
 */
export async function readActionForm(request: NextRequest): Promise<FormData> {
  const type = request.headers.get("content-type") ?? "";
  if (type.includes("multipart/form-data") || type.includes("application/x-www-form-urlencoded")) {
    return request.formData();
  }
  const form = new FormData();
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return form;
  const append = (key: string, value: unknown) => {
    if (value === null || value === undefined || value === false) return;
    if (value === true) form.append(key, "on");
    else if (typeof value === "object") form.append(key, JSON.stringify(value));
    else form.append(key, String(value));
  };
  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) value.forEach((v) => append(key, v));
    else append(key, value);
  }
  return form;
}

/** `page`, `pageSize` and `q` (or `search`) from the query string. */
export function staffListParams(request: NextRequest, defaultPageSize = 20) {
  const params = request.nextUrl.searchParams;
  const { page, pageSize } = parseApiPagination(params, defaultPageSize);
  const q = (params.get("q") ?? params.get("search") ?? "").trim();
  return { page, pageSize, q, params };
}

/** The list shape the app reads: `{ data, totalCount, page, pageSize }`. */
export function pagedBody<T>(items: T[], totalCount: number, page: number, pageSize: number) {
  return { data: items, totalCount, page, pageSize };
}
