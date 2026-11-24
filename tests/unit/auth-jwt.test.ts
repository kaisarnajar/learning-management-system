import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";

vi.mock("@/services/teacher-auth", () => ({
  resolveUserRole: vi.fn(async () => "USER"),
  getTeacherByEmail: vi.fn(async () => null),
}));

import { prisma } from "@/utils/prisma";
import { authJwtCallback } from "@/services/auth-jwt";

const findUnique = vi.fn();
(prisma as unknown as { user: unknown }).user = { findUnique, update: vi.fn() };

const dbUser = (sessionVersion: number, email = "student@example.test") => ({
  email,
  emailVerified: new Date("2026-01-01T00:00:00Z"),
  name: "Student",
  image: null,
  deletedAt: null,
  sessionVersion,
});

type CallbackArgs = Parameters<typeof authJwtCallback>[0];
const run = (args: Partial<CallbackArgs> & { token: JWT }) => authJwtCallback(args as CallbackArgs);

/** A token from an earlier request whose one-minute refresh window has passed. */
const staleToken = (claims: Partial<JWT> = {}): JWT => ({
  email: "student@example.test",
  id: "user_1",
  role: "USER",
  refreshedAt: Date.now() - 5 * 60_000,
  ...claims,
});

describe("web session version (jwt callback)", () => {
  beforeEach(() => findUnique.mockReset());

  it("copies the account's session version into the token at sign-in", async () => {
    findUnique.mockResolvedValue(dbUser(3));
    const token = await run({ token: { email: "student@example.test" }, user: { id: "user_1", email: "student@example.test" } });
    expect(token).toMatchObject({ id: "user_1", sessionVersion: 3 });
  });

  it("keeps a session whose version still matches", async () => {
    findUnique.mockResolvedValue(dbUser(3));
    expect(await run({ token: staleToken({ sessionVersion: 3 }) })).toMatchObject({ sessionVersion: 3, role: "USER" });
  });

  it("ends a session issued before a password reset or change", async () => {
    findUnique.mockResolvedValue(dbUser(4));
    expect(await run({ token: staleToken({ sessionVersion: 3 }) })).toBeNull();
  });

  it("reads a token issued before the claim existed as version 0, so the deploy signs nobody out", async () => {
    findUnique.mockResolvedValue(dbUser(0));
    expect(await run({ token: staleToken() })).not.toBeNull();

    // ...but such a token still ends once the account's version moves on.
    findUnique.mockResolvedValue(dbUser(1));
    expect(await run({ token: staleToken() })).toBeNull();
  });

  it("checks again only when the token is due for a refresh", async () => {
    const fresh = staleToken({ sessionVersion: 3, refreshedAt: Date.now() });
    expect(await run({ token: fresh })).toBe(fresh);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe("web session lookup (jwt callback)", () => {
  beforeEach(() => findUnique.mockReset());

  it("reads the account by the token's id, not its address", async () => {
    findUnique.mockResolvedValue(dbUser(0));
    await run({ token: staleToken() });
    expect(findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "user_1" } }));
  });

  it("ends a session whose account now has another address", async () => {
    findUnique.mockResolvedValue(dbUser(0, "someone.else@example.test"));
    expect(await run({ token: staleToken() })).toBeNull();
  });

  it("ends a session without a user id", async () => {
    expect(await run({ token: staleToken({ id: undefined }) })).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });
});
