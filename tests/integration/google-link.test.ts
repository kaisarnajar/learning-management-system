import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { issueApiSession, rotateApiSession } from "@/services/api-auth";
import { prepareGoogleLink } from "@/services/google-link";
import { createAuthAdapter } from "@/services/auth-adapter";
import { createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

/** The web Google sign-in check that runs before Auth.js links an existing row. */
describe.skipIf(SKIP_WITHOUT_DB)("prepareGoogleLink", () => {
  beforeEach(resetDb);

  const sessionFor = (user: { id: string; email: string }) => issueApiSession({ id: user.id, email: user.email, role: "USER" });

  it("scrubs a squatter's password on an unverified row and ends their API sessions", async () => {
    const squatter = await createUser({ email: "owner@example.test", emailVerified: null, password: "attacker-hash" });
    const { refreshToken } = await sessionFor(squatter);

    expect(await prepareGoogleLink(" Owner@Example.test ")).toBe(true);

    const row = await prisma.user.findUniqueOrThrow({ where: { id: squatter.id } });
    expect(row.password).toBeNull();
    expect(row.emailVerified).not.toBeNull();
    // Web sessions on the row end too (services/auth-jwt.ts).
    expect(row.sessionVersion).toBe(1);
    expect(await rotateApiSession(refreshToken)).toBeNull();
  });

  it("leaves a verified account's sessions alone and refuses a removed account", async () => {
    const owner = await createUser({ email: "verified@example.test" });
    const { refreshToken } = await sessionFor(owner);

    expect(await prepareGoogleLink("verified@example.test")).toBe(true);
    expect(await rotateApiSession(refreshToken)).not.toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { id: owner.id } })).sessionVersion).toBe(0);

    await prisma.user.update({ where: { id: owner.id }, data: { deletedAt: new Date() } });
    expect(await prepareGoogleLink("verified@example.test")).toBe(false);
  });

  it("lets a new address through untouched", async () => {
    expect(await prepareGoogleLink("nobody@example.test")).toBe(true);
    expect(await prisma.user.count()).toBe(0);
  });
});

/** What Auth.js stores when a Google account is linked on the web. */
describe.skipIf(SKIP_WITHOUT_DB)("auth adapter", () => {
  beforeEach(resetDb);

  it("links a Google account without keeping its OAuth tokens", async () => {
    const user = await createUser({ email: "linker@example.test" });
    const adapter = createAuthAdapter(prisma);

    await adapter.linkAccount!({
      userId: user.id,
      type: "oidc",
      provider: "google",
      providerAccountId: "google-sub-1",
      access_token: "ya29.access",
      refresh_token: "1//refresh",
      id_token: "eyJ.id.token",
      expires_at: 1_900_000_000,
      token_type: "bearer",
      scope: "openid email profile",
    });

    const account = await prisma.account.findFirstOrThrow({ where: { userId: user.id } });
    expect(account).toMatchObject({
      provider: "google",
      providerAccountId: "google-sub-1",
      access_token: null,
      refresh_token: null,
      id_token: null,
    });
  });

  it("records policy acceptance on a user it creates", async () => {
    const created = await createAuthAdapter(prisma).createUser!({
      id: "ignored",
      email: "new-google@example.test",
      emailVerified: new Date(),
      name: "New",
    });
    const row = await prisma.user.findUniqueOrThrow({ where: { id: created.id } });
    expect(row.policiesAcceptedAt).not.toBeNull();
  });
});
