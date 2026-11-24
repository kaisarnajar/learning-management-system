import { PrismaAdapter } from "@auth/prisma-adapter";
import type { Adapter, AdapterAccount } from "next-auth/adapters";
import type { PrismaClient } from "@prisma/client";
import { CURRENT_POLICIES_VERSION } from "@/config/constants";

/**
 * OAuth credentials Google hands back at sign-in. The app only uses Google to
 * prove who someone is; it never calls a Google API on their behalf, so
 * keeping these would only be a liability if the database leaked.
 */
const UNUSED_OAUTH_SECRETS = ["access_token", "refresh_token", "id_token"] as const;

export function withoutOAuthSecrets(account: AdapterAccount): AdapterAccount {
  const copy = { ...account };
  for (const field of UNUSED_OAUTH_SECRETS) delete copy[field];
  return copy;
}

/**
 * The Prisma adapter Auth.js uses, with two changes: a new user records that
 * they accepted the current policies, and linked accounts keep no OAuth tokens.
 */
export function createAuthAdapter(client: PrismaClient): Adapter {
  const adapter = PrismaAdapter(client);
  const { createUser, linkAccount } = adapter;
  if (createUser) {
    adapter.createUser = (user) =>
      createUser({
        ...user,
        policiesAcceptedAt: new Date(),
        policiesAcceptedVersion: CURRENT_POLICIES_VERSION,
      } as Parameters<typeof createUser>[0]);
  }
  if (linkAccount) {
    adapter.linkAccount = (account) => linkAccount(withoutOAuthSecrets(account));
  }
  return adapter;
}
