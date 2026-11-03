import { beforeEach, describe, expect, it, vi } from "vitest";
import { encode } from "next-auth/jwt";
import { prisma } from "@/utils/prisma";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as refresh } from "@/app/api/v1/auth/refresh/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { POST as google } from "@/app/api/v1/auth/google/route";
import { GET as me, PUT as updateMe } from "@/app/api/v1/auth/me/route";
import { createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, bearer, createPasswordUser, jsonOf, signedInStudent } from "../helpers/api";

const verifyIdToken = vi.fn();
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken;
  },
}));

describe.skipIf(SKIP_WITHOUT_DB)("/api/v1/auth", () => {
  beforeEach(async () => {
    await resetDb();
    verifyIdToken.mockReset();
    delete process.env.AUTH_GOOGLE_ID;
  });

  describe("register", () => {
    const body = { name: "New Student", email: " New.Student@Example.com ", password: "long-enough-1", acceptPolicies: true };

    it("creates an unverified account and returns a token pair", async () => {
      const response = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: body }));
      const data = await jsonOf(response);

      expect(response.status).toBe(200);
      expect(data).toMatchObject({ success: true, user: { email: "new.student@example.com", emailVerified: null, role: "USER" } });
      expect(data.accessToken).toBeTruthy();
      expect(data.token).toBe(data.accessToken);
      expect(data.refreshToken).toBeTruthy();
      expect(data.expiresIn).toBe(3600);

      const row = await prisma.user.findUniqueOrThrow({ where: { email: "new.student@example.com" } });
      expect(row.password).not.toBe(body.password);
      expect(row.password).toMatch(/^\$2[aby]\$/);
      expect(row.emailVerified).toBeNull();
      expect(await prisma.apiRefreshToken.count({ where: { userId: row.id } })).toBe(1);
    });

    it("rejects invalid details and duplicate addresses", async () => {
      const weak = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: { ...body, password: "short" } }));
      expect(weak.status).toBe(400);

      const noPolicies = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: { ...body, acceptPolicies: false } }));
      expect(noPolicies.status).toBe(400);
      expect((await jsonOf(noPolicies)).error).toMatch(/Terms/);

      await createUser({ email: "new.student@example.com" });
      const duplicate = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: body }));
      expect(duplicate.status).toBe(400);
      expect((await jsonOf(duplicate)).error).toMatch(/already exists/);
    });

    it("limits registrations per network", async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const response = await register(
          apiRequest("/api/v1/auth/register", { method: "POST", ip: "203.0.113.9", json: { ...body, email: `user${i}@example.com`, password: "long-enough-1" } }),
        );
        statuses.push(response.status);
      }
      expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statuses[5]).toBe(429);
    });
  });

  describe("login", () => {
    it("signs in a verified user with the right password", async () => {
      const { user, password } = await createPasswordUser();

      const response = await login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: user.email.toUpperCase(), password } }));
      const data = await jsonOf(response);

      expect(response.status).toBe(200);
      expect(data.user).toMatchObject({ id: user.id, email: user.email, role: "USER" });
      expect(data.accessToken).toBeTruthy();
      expect(data.refreshToken).toBeTruthy();
      expect(JSON.stringify(data)).not.toContain("password");
    });

    it("answers wrong password, unknown user and removed account identically", async () => {
      const { user } = await createPasswordUser();
      const removed = await createPasswordUser("correct-horse-1", { deletedAt: new Date() });

      const responses = await Promise.all([
        login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: user.email, password: "wrong-password" } })),
        login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: "nobody@example.test", password: "whatever-1" } })),
        login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: removed.user.email, password: removed.password } })),
      ]);

      for (const response of responses) {
        expect(response.status).toBe(401);
        expect((await jsonOf(response)).error).toBe("Invalid email or password.");
      }
    });

    it("asks an unverified user to verify first", async () => {
      const { user, password } = await createPasswordUser("correct-horse-1", { emailVerified: null });

      const response = await login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: user.email, password } }));

      expect(response.status).toBe(403);
      expect(await jsonOf(response)).toMatchObject({ code: "email_not_verified" });
    });

    it("requires both fields and throttles repeated attempts for one address", async () => {
      expect((await login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: "a@example.test" } }))).status).toBe(400);
      expect((await login(apiRequest("/api/v1/auth/login", { method: "POST", json: {} }))).status).toBe(400);

      const { user } = await createPasswordUser();
      const statuses: number[] = [];
      for (let i = 0; i < 6; i++) {
        const response = await login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: user.email, password: "nope-nope-1" } }));
        statuses.push(response.status);
      }
      expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    });
  });

  describe("me", () => {
    it("requires a Bearer access token", async () => {
      expect((await me(apiRequest("/api/v1/auth/me"))).status).toBe(401);
      expect((await me(apiRequest("/api/v1/auth/me", { headers: { authorization: "Bearer " } }))).status).toBe(401);
      expect((await me(apiRequest("/api/v1/auth/me", { headers: { authorization: "Bearer not-a-token" } }))).status).toBe(401);
      expect((await me(apiRequest("/api/v1/auth/me", { headers: { authorization: "Basic abc" } }))).status).toBe(401);
    });

    it("returns the signed-in profile and never another user's", async () => {
      const a = await signedInStudent({ name: "Alice" });
      await signedInStudent({ name: "Bob" });

      const response = await me(apiRequest("/api/v1/auth/me", { headers: a.headers }));
      const data = await jsonOf(response);

      expect(response.status).toBe(200);
      expect(data.user).toMatchObject({ id: a.user.id, name: "Alice", role: "USER" });
      expect(data.user).not.toHaveProperty("password");
    });

    it("does not accept a browser session cookie, with or without a Bearer header", async () => {
      const student = await signedInStudent();
      const webSession = await encode({
        token: { id: student.user.id, email: student.user.email, sub: student.user.id },
        secret: process.env.AUTH_SECRET!,
        salt: "authjs.session-token",
      });

      const cookieOnly = await me(apiRequest("/api/v1/auth/me", { headers: { cookie: `authjs.session-token=${webSession}` } }));
      expect(cookieOnly.status).toBe(401);

      const asBearer = await me(apiRequest("/api/v1/auth/me", { headers: bearer(webSession) }));
      expect(asBearer.status).toBe(401);
    });

    it("rejects an access token whose session no longer exists or has expired", async () => {
      const student = await signedInStudent();
      await prisma.apiRefreshToken.updateMany({ where: { userId: student.user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

      expect((await me(apiRequest("/api/v1/auth/me", { headers: student.headers }))).status).toBe(401);
    });

    it("rejects tokens of removed accounts", async () => {
      const student = await signedInStudent();
      await prisma.user.update({ where: { id: student.user.id }, data: { deletedAt: new Date() } });

      expect((await me(apiRequest("/api/v1/auth/me", { headers: student.headers }))).status).toBe(401);
    });

    it("updates allowed profile fields and refuses unknown keys and foreign image hosts", async () => {
      const student = await signedInStudent({ name: "Alice" });

      const ok = await updateMe(apiRequest("/api/v1/auth/me", { method: "PUT", headers: student.headers, json: { name: "Alice Khan", address: "99 New Road, Delhi" } }));
      expect(ok.status).toBe(200);
      expect((await prisma.user.findUniqueOrThrow({ where: { id: student.user.id } }))).toMatchObject({ name: "Alice Khan", address: "99 New Road, Delhi" });

      const elevate = await updateMe(apiRequest("/api/v1/auth/me", { method: "PUT", headers: student.headers, json: { role: "ADMIN" } }));
      expect(elevate.status).toBe(400);

      const external = await updateMe(apiRequest("/api/v1/auth/me", { method: "PUT", headers: student.headers, json: { image: "http://169.254.169.254/latest/meta-data" } }));
      expect(external.status).toBe(400);

      const invalid = await updateMe(apiRequest("/api/v1/auth/me", { method: "PUT", headers: student.headers, json: { whatsapp: "12" } }));
      expect(invalid.status).toBe(400);

      expect((await updateMe(apiRequest("/api/v1/auth/me", { method: "PUT", json: { name: "No Auth" } }))).status).toBe(401);
    });
  });

  describe("refresh and logout", () => {
    const post = (handler: typeof refresh, path: string, json: unknown, headers: Record<string, string> = {}) =>
      handler(apiRequest(path, { method: "POST", json, headers }));

    it("rotates the pair, invalidating the old refresh token and old access token", async () => {
      const student = await signedInStudent();

      const first = await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken });
      const next = await jsonOf(first);
      expect(first.status).toBe(200);
      expect(next.refreshToken).not.toBe(student.tokens.refreshToken);
      expect(next.accessToken).not.toBe(student.tokens.accessToken);

      // the exchanged token is single use
      expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken })).status).toBe(401);
      // the old access token belonged to the old session
      expect((await me(apiRequest("/api/v1/auth/me", { headers: student.headers }))).status).toBe(401);
      // the new pair works
      expect((await me(apiRequest("/api/v1/auth/me", { headers: bearer(next.accessToken) }))).status).toBe(200);
      expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: next.refreshToken })).status).toBe(200);
    });

    it("lets only one of two simultaneous exchanges of the same token succeed", async () => {
      const student = await signedInStudent();

      const results = await Promise.all([
        post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken }),
        post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken }),
      ]);

      expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
    });

    it("refuses missing, unknown and expired refresh tokens", async () => {
      expect((await post(refresh, "/api/v1/auth/refresh", {})).status).toBe(400);
      expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: "unknown" })).status).toBe(401);

      const student = await signedInStudent();
      await prisma.apiRefreshToken.updateMany({ where: { userId: student.user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken })).status).toBe(401);
    });

    it("refuses to refresh for a removed account", async () => {
      const student = await signedInStudent();
      await prisma.user.update({ where: { id: student.user.id }, data: { deletedAt: new Date() } });

      expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken })).status).toBe(401);
    });

    it("logout ends the session at once for both tokens", async () => {
      const student = await signedInStudent();

      const response = await post(logout, "/api/v1/auth/logout", { refreshToken: student.tokens.refreshToken }, student.headers);

      expect(response.status).toBe(200);
      expect((await me(apiRequest("/api/v1/auth/me", { headers: student.headers }))).status).toBe(401);
      expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken })).status).toBe(401);
    });

    it("logout with only a refresh token or only an access token also works, and is harmless without credentials", async () => {
      const a = await signedInStudent();
      expect((await post(logout, "/api/v1/auth/logout", { refreshToken: a.tokens.refreshToken })).status).toBe(200);
      expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: a.tokens.refreshToken })).status).toBe(401);

      const b = await signedInStudent();
      expect((await logout(apiRequest("/api/v1/auth/logout", { method: "POST", headers: b.headers }))).status).toBe(200);
      expect((await me(apiRequest("/api/v1/auth/me", { headers: b.headers }))).status).toBe(401);

      expect((await logout(apiRequest("/api/v1/auth/logout", { method: "POST" }))).status).toBe(200);
    });

    it("logging one session out leaves the user's other sessions alone", async () => {
      const first = await signedInStudent();
      const { issueApiSession } = await import("@/services/api-auth");
      const second = await issueApiSession({ id: first.user.id, email: first.user.email, role: "USER" });

      await post(logout, "/api/v1/auth/logout", {}, first.headers);

      expect((await me(apiRequest("/api/v1/auth/me", { headers: bearer(second.accessToken) }))).status).toBe(200);
    });
  });

  describe("google", () => {
    const payload = { iss: "https://accounts.google.com", aud: "client-id", email: "g.user@example.com", email_verified: true, name: "G User", picture: "https://lh3.googleusercontent.com/a" };
    const call = (idToken: unknown = "id-token") => google(apiRequest("/api/v1/auth/google", { method: "POST", json: { idToken } }));

    it("requires a token and a configured client id", async () => {
      expect((await google(apiRequest("/api/v1/auth/google", { method: "POST", json: {} }))).status).toBe(400);
      expect((await call()).status).toBe(503);
    });

    it("creates a verified account for a valid Google token", async () => {
      process.env.AUTH_GOOGLE_ID = "client-id";
      verifyIdToken.mockResolvedValue({ getPayload: () => payload });

      const response = await call();
      const data = await jsonOf(response);

      expect(response.status).toBe(200);
      expect(data.user).toMatchObject({ email: "g.user@example.com", name: "G User" });
      expect(data.user.emailVerified).not.toBeNull();
      expect(verifyIdToken).toHaveBeenCalledWith({ idToken: "id-token", audience: "client-id" });
    });

    it.each([
      ["a different audience", { ...payload, aud: "someone-elses-client" }],
      ["a foreign issuer", { ...payload, iss: "https://evil.example.com" }],
      ["an unverified email", { ...payload, email_verified: false }],
      ["no email", { ...payload, email: undefined }],
    ])("refuses a token with %s", async (_label, claims) => {
      process.env.AUTH_GOOGLE_ID = "client-id";
      verifyIdToken.mockResolvedValue({ getPayload: () => claims });

      expect((await call()).status).toBe(401);
      expect(await prisma.user.count()).toBe(0);
    });

    it("refuses a token Google's library rejects", async () => {
      process.env.AUTH_GOOGLE_ID = "client-id";
      verifyIdToken.mockRejectedValue(new Error("Wrong recipient"));

      expect((await call()).status).toBe(401);
    });

    it("scrubs a password set on an unverified account before linking it, and refuses removed accounts", async () => {
      process.env.AUTH_GOOGLE_ID = "client-id";
      verifyIdToken.mockResolvedValue({ getPayload: () => payload });
      const squatter = await createUser({ email: "g.user@example.com", emailVerified: null, password: "attacker-hash" });

      expect((await call()).status).toBe(200);
      expect(await prisma.user.findUniqueOrThrow({ where: { id: squatter.id } })).toMatchObject({ password: null });

      await prisma.user.update({ where: { id: squatter.id }, data: { deletedAt: new Date() } });
      expect((await call()).status).toBe(403);
    });
  });
});
