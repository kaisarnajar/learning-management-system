import type { Session } from "next-auth";

/** Parse ADMIN_EMAIL — one address or comma/semicolon-separated list. */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAIL?.trim();
  if (!raw) return [];

  return [
    ...new Set(
      raw
        .split(/[,;]/)
        .map((email) => email.toLowerCase().trim())
        .filter(Boolean),
    ),
  ];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return getAdminEmails().includes(normalized);
}

export function isAdminSession(session: Session | null): boolean {
  return session?.user?.role === "ADMIN" || session?.user?.role === "DEVELOPER";
}
