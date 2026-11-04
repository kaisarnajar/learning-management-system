import type { UserRole } from "@/services/teacher-auth";

/**
 * True only for same-origin absolute paths. Rejects protocol-relative
 * (`//evil.com`), backslash (`/\evil.com`) and header-injection variants
 * that `startsWith("/")` alone would accept.
 */
export function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value || typeof value !== "string") return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  if (/[\r\n\0]/.test(value)) return false;
  try {
    const parsed = new URL(value, "http://internal.invalid");
    return parsed.origin === "http://internal.invalid";
  } catch {
    return false;
  }
}

/** Returns the path when it is safe, otherwise the fallback. */
export function safeInternalPath(value: string | null | undefined, fallback = "/"): string {
  return isSafeInternalPath(value) ? value : fallback;
}

/** Where to send the user after sign-in based on role and optional deep link. */
export function getPostLoginPath(
  role: UserRole | string | undefined,
  callbackUrl: string = "/",
): string {
  const target = safeInternalPath(callbackUrl);

  if (role === "DEVELOPER") {
    if (target.startsWith("/developer") || target.startsWith("/admin")) return target;
    return "/admin";
  }

  if (role === "TEACHER") {
    if (target.startsWith("/teacher")) return target;
    return "/teacher";
  }

  if (role === "ADMIN") {
    if (target.startsWith("/admin")) return target;
    if (target === "/") return "/admin";
    return target;
  }

  return target;
}

export function authContinueUrl(callbackUrl: string = "/"): string {
  const target = safeInternalPath(callbackUrl);
  return `/auth/continue?callbackUrl=${encodeURIComponent(target)}`;
}
