import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { issueApiSession, rotateApiSession } from "@/services/api-auth";
import { prepareGoogleLink } from "@/services/google-link";
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
    expect(await rotateApiSession(refreshToken)).toBeNull();
  });

  it("leaves a verified account's sessions alone and refuses a removed account", async () => {
    const owner = await createUser({ email: "verified@example.test" });
    const { refreshToken } = await sessionFor(owner);

    expect(await prepareGoogleLink("verified@example.test")).toBe(true);
    expect(await rotateApiSession(refreshToken)).not.toBeNull();

    await prisma.user.update({ where: { id: owner.id }, data: { deletedAt: new Date() } });
    expect(await prepareGoogleLink("verified@example.test")).toBe(false);
  });

  it("lets a new address through untouched", async () => {
    expect(await prepareGoogleLink("nobody@example.test")).toBe(true);
    expect(await prisma.user.count()).toBe(0);
  });
});
