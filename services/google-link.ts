import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { revokeAllApiSessions } from "@/services/api-auth";

/**
 * What to do when Google signs in an address that exists as an unverified
 * password account: "scrub" (default) nulls that password and marks the
 * address verified before linking; "refuse" sends the user back to /login.
 */
const UNVERIFIED_LINK_POLICY = process.env.AUTH_GOOGLE_LINK_UNVERIFIED === "refuse" ? "refuse" : "scrub";

type GoogleSignInArgs = {
  user: { email?: string | null };
  account?: { provider?: string } | null;
  profile?: { email_verified?: unknown } | null;
};

/**
 * The Auth.js `signIn` callback. Only Google sign-ins are checked. Auth.js
 * links a Google account to the row with the same address
 * (allowDangerousEmailAccountLinking), and the link scrubs passwords and
 * grants staff roles by address, so Google must vouch for the address:
 * anything but `email_verified === true` is refused, as the mobile route does.
 */
export async function googleSignInCallback({ user, account, profile }: GoogleSignInArgs): Promise<boolean | string> {
  if (account?.provider !== "google") return true;
  if (profile?.email_verified !== true) return false;
  if (!user.email) return true;
  return prepareGoogleLink(user.email);
}

/**
 * The web Google sign-in check, before Auth.js
 * links the Google account to an existing row with the same address. Returns
 * what the callback returns: true to continue, false to deny, or a redirect.
 */
export async function prepareGoogleLink(rawEmail: string): Promise<boolean | string> {
  const email = rawEmail.toLowerCase().trim();
  const existing = await withDbErrorHandling(
    () => prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true, password: true, deletedAt: true },
    }),
    "Database operation failed",
  );
  if (!existing) return true;
  if (existing.deletedAt) return false;
  if (existing.emailVerified) return true;

  // The row was created with a password nobody has proven ownership of.
  // Google has just proven ownership of the address, so the password
  // (possibly set by someone else) must not survive the link.
  if (existing.password && UNVERIFIED_LINK_POLICY === "refuse") return "/login?error=unverified-link";
  // Whoever registered the unverified row may hold a session; none carries
  // over to the account the real owner is taking back. sessionVersion ends
  // web sessions (services/auth-jwt.ts); the owner's new session reads the
  // bumped value when the jwt callback runs after this one.
  await withDbErrorHandling(
    () => prisma.user.update({
      where: { id: existing.id },
      data: existing.password
        ? { password: null, emailVerified: new Date(), sessionVersion: { increment: 1 } }
        : { sessionVersion: { increment: 1 } },
    }),
    "Database operation failed",
  );
  await revokeAllApiSessions(existing.id);
  return true;
}
