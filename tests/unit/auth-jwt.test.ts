import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JWT } from "next-auth/jwt";

vi.mock("@/services/teacher-auth", () => ({
  resolveUserRole: vi.fn(async () => "USER"),
  getTeacherByEmail: vi.fn(async () => null),
}));

import { prisma } from "@/utils/prisma";
import { authJwtCallback, CLAIMS_REUSE_MS, forgetRecentClaims } from "@/services/auth-jwt";
import { getTeacherByEmail, resolveUserRole } from "@/services/teacher-auth";

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

beforeEach(() => forgetRecentClaims());

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

    // ...but such a token still ends once the account's version moves on (on a later request).
    forgetRecentClaims();
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

describe("re-reads shared within a request (jwt callback)", () => {
  beforeEach(() => {
    findUnique.mockReset();
    vi.mocked(resolveUserRole).mockReset().mockResolvedValue("USER");
    vi.mocked(getTeacherByEmail).mockReset().mockResolvedValue(null);
  });

  it("reads the account and role once for several auth() calls with the same stale token", async () => {
    findUnique.mockResolvedValue(dbUser(0));
    vi.mocked(resolveUserRole).mockResolvedValue("TEACHER");
    vi.mocked(getTeacherByEmail).mockResolvedValue({ id: "teacher_1" } as Awaited<ReturnType<typeof getTeacherByEmail>>);

    // A page render calls auth() from the layout, the page and a guard, each with the cookie's stale token.
    const tokens = await Promise.all([run({ token: staleToken() }), run({ token: staleToken() })]);
    tokens.push(await run({ token: staleToken() }));

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(resolveUserRole).toHaveBeenCalledTimes(1);
    expect(getTeacherByEmail).toHaveBeenCalledTimes(1);
    for (const token of tokens) expect(token).toMatchObject({ role: "TEACHER", teacherId: "teacher_1" });
  });

  it("reads again after the reuse window, on update() and at sign-in", async () => {
    vi.useFakeTimers({ now: new Date("2026-11-25T10:00:00Z") });
    try {
      findUnique.mockResolvedValue(dbUser(0));
      await run({ token: staleToken() });
      await run({ token: staleToken() });
      expect(findUnique).toHaveBeenCalledTimes(1);

      await run({ token: staleToken(), trigger: "update" });
      expect(findUnique).toHaveBeenCalledTimes(2);

      await run({ token: { email: "student@example.test" }, user: { id: "user_1", email: "student@example.test" } });
      expect(findUnique).toHaveBeenCalledTimes(3);

      vi.advanceTimersByTime(CLAIMS_REUSE_MS + 1);
      await run({ token: staleToken() });
      expect(findUnique).toHaveBeenCalledTimes(4);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not share a failed read", async () => {
    findUnique.mockRejectedValueOnce(new Error("connection reset")).mockResolvedValue(dbUser(0));
    // The failure keeps the token's role, as before.
    expect(await run({ token: staleToken({ role: "ADMIN" }) })).toMatchObject({ role: "ADMIN" });
    expect(await run({ token: staleToken() })).toMatchObject({ role: "USER" });
    expect(findUnique).toHaveBeenCalledTimes(2);
  });

  it("keeps the session checks per token: a shared read still ends an outdated session", async () => {
    findUnique.mockResolvedValue(dbUser(2));
    expect(await run({ token: staleToken({ sessionVersion: 2 }) })).not.toBeNull();
    expect(await run({ token: staleToken({ sessionVersion: 1 }) })).toBeNull();
    expect(findUnique).toHaveBeenCalledTimes(1);
  });
});
