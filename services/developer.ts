import type { Session } from "next-auth";

/** Parse DEVELOPER_EMAIL — one address or comma/semicolon-separated list. */
export function getDeveloperEmails(): string[] {
  const raw = process.env.DEVELOPER_EMAIL?.trim();
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

export function isDeveloperEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return getDeveloperEmails().includes(normalized);
}

export function isDeveloperSession(session: Session | null): boolean {
  return session?.user?.role === "DEVELOPER";
}
