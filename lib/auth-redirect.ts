import type { UserRole } from "@/lib/teacher-auth";

/** Where to send the user after sign-in based on role and optional deep link. */
export function getPostLoginPath(
  role: UserRole | string | undefined,
  callbackUrl: string = "/",
): string {
  const target = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";

  if (role === "DEVELOPER") {
    if (target.startsWith("/developer") || target.startsWith("/admin")) return target;
    return "/developer";
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
  const target = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/";
  return `/auth/continue?callbackUrl=${encodeURIComponent(target)}`;
}
