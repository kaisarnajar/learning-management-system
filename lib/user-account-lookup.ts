import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

export function normalizeAccountEmail(email: string): string {
  return email.toLowerCase().trim();
}

export type RegisteredUserLookup =
  | { ok: true; userId: string; name: string; email: string; image: string | null }
  | { ok: false; error: string };

/** Admin actions may only target emails that already belong to a registered user. */
export async function lookupRegisteredUser(
  email: string,
  options?: { notFoundMessage?: string },
): Promise<RegisteredUserLookup> {
  const normalized = normalizeAccountEmail(email);

  if (!normalized) {
    return { ok: false, error: "Enter an email address." };
  }

  const user = await withDbErrorHandling(() => prisma.user.findUnique({ where: { email: normalized } }), "Database operation failed");
  if (!user) {
    return {
      ok: false,
      error:
        options?.notFoundMessage ??
        "No account found with this email. They must register on the site first.",
    };
  }

  const displayName = user.name?.trim() || normalized.split("@")[0] || "User";

  return { ok: true, userId: user.id, name: displayName, email: normalized, image: user.image };
}
