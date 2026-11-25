/**
 * Clears the Google OAuth tokens stored on linked accounts. The app only uses
 * Google to prove who someone is and never calls a Google API on their behalf,
 * so the access, refresh and ID tokens Auth.js used to keep were unused
 * secrets. New links no longer store them (services/auth-adapter.ts).
 *
 * The snapshot records which accounts had which tokens, never the tokens
 * themselves: they are deliberately discarded, so this cannot be reversed
 * (nor does it need to be; the next Google sign-in still works).
 *
 * Usage:
 *   npx tsx scripts/clear-oauth-tokens.ts            # dry run: report only
 *   npx tsx scripts/clear-oauth-tokens.ts --apply    # write after snapshotting
 *
 * Idempotent: a second run finds nothing to clear.
 */
import { createPrismaClient } from "../utils/prisma-client";
import { isApplyMode, printMode, writeSnapshot } from "./lib/dry-run";

const prisma = createPrismaClient();

const HAS_TOKEN = {
  OR: [{ access_token: { not: null } }, { refresh_token: { not: null } }, { id_token: { not: null } }],
};

async function main() {
  const apply = isApplyMode();
  printMode("clear-oauth-tokens", apply);

  const accounts = await prisma.account.findMany({
    where: HAS_TOKEN,
    select: { userId: true, provider: true, providerAccountId: true, access_token: true, refresh_token: true, id_token: true },
  });
  const rows = accounts.map((account) => ({
    userId: account.userId,
    provider: account.provider,
    providerAccountId: account.providerAccountId,
    hadAccessToken: account.access_token !== null,
    hadRefreshToken: account.refresh_token !== null,
    hadIdToken: account.id_token !== null,
  }));

  console.log(`Linked accounts holding OAuth tokens: ${rows.length}`);
  for (const row of rows) {
    console.log(`  ${row.provider}  user ${row.userId}  access=${row.hadAccessToken} refresh=${row.hadRefreshToken} id=${row.hadIdToken}`);
  }

  if (!apply || rows.length === 0) {
    if (rows.length === 0) console.log("Nothing to write.");
    return;
  }

  const snapshot = writeSnapshot("clear-oauth-tokens", rows);
  console.log(`Snapshot written to ${snapshot}`);

  const { count } = await prisma.account.updateMany({
    where: HAS_TOKEN,
    data: { access_token: null, refresh_token: null, id_token: null },
  });
  console.log(`Cleared tokens on ${count} account(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
