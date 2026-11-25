import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/services/api-auth", () => ({ revokeAllApiSessions: vi.fn() }));

import { prisma } from "@/utils/prisma";
import { googleSignInCallback } from "@/services/google-link";

const findUnique = vi.fn();
(prisma as unknown as { user: unknown }).user = { findUnique, update: vi.fn() };

const google = { provider: "google" };
const user = { email: "student@example.test" };

/** The web Auth.js signIn callback: Google must vouch for the address before it is linked. */
describe("googleSignInCallback", () => {
  beforeEach(() => {
    findUnique.mockReset();
    findUnique.mockResolvedValue(null);
  });

  it.each([
    ["false", { email_verified: false }],
    ["missing", {}],
    ["the string \"true\"", { email_verified: "true" }],
    ["no profile", undefined],
  ])("refuses a Google sign-in whose email_verified is %s, without touching the account", async (_label, profile) => {
    expect(await googleSignInCallback({ user, account: google, profile })).toBe(false);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("continues to the link check for a Google-verified address", async () => {
    expect(await googleSignInCallback({ user, account: google, profile: { email_verified: true } })).toBe(true);
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "student@example.test" } }));
  });

  it("leaves other providers alone", async () => {
    expect(await googleSignInCallback({ user, account: { provider: "credentials" }, profile: undefined })).toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
