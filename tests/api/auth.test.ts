import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encode } from "next-auth/jwt";
import { prisma } from "@/utils/prisma";
import { POST as register } from "@/app/api/v1/auth/register/route";
import { POST as webRegister } from "@/app/api/auth/register/route";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as refresh } from "@/app/api/v1/auth/refresh/route";
import { POST as logout } from "@/app/api/v1/auth/logout/route";
import { POST as google } from "@/app/api/v1/auth/google/route";
import { GET as me, PUT as updateMe } from "@/app/api/v1/auth/me/route";
import { GET as teacherCourses } from "@/app/api/v1/teacher/courses/route";
import { GET as adminDashboard } from "@/app/api/v1/admin/dashboard/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { POST as changePassword } from "@/app/api/v1/auth/change-password/route";
import { confirmEmailVerification } from "@/app/verify-email/actions";
import { createPasswordResetToken } from "@/services/password-reset";
import { generateVerificationToken } from "@/services/tokens";
import { sendAccountExistsEmail, sendVerificationEmail } from "@/services/email";
import { REGISTRATION_MESSAGE } from "@/services/account-registration";
import { authJwtCallback } from "@/services/auth-jwt";
import { issueApiSession, REFRESH_REUSE_GRACE_MS } from "@/services/api-auth";
import { deleteOwnAccount } from "@/services/account-deletion";
import { createTeacher, createUser, resetDb, runAction, SKIP_WITHOUT_DB } from "../helpers/db";
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

    it("creates an unverified account and e-mails a verification link, without a session", async () => {
      vi.mocked(sendVerificationEmail).mockClear();
      const response = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: body }));
      const data = await jsonOf(response);

      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true, verificationRequired: true, message: REGISTRATION_MESSAGE });

      const row = await prisma.user.findUniqueOrThrow({ where: { email: "new.student@example.com" } });
      expect(row.password).not.toBe(body.password);
      expect(row.password).toMatch(/^\$2[aby]\$/);
      expect(row.emailVerified).toBeNull();
      expect(await prisma.apiRefreshToken.count({ where: { userId: row.id } })).toBe(0);
      expect(sendVerificationEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "new.student@example.com" }));
    });

    it("rejects invalid details", async () => {
      const weak = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: { ...body, password: "short" } }));
      expect(weak.status).toBe(400);

      const noPolicies = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: { ...body, acceptPolicies: false } }));
      expect(noPolicies.status).toBe(400);
      expect((await jsonOf(noPolicies)).error).toMatch(/Terms/);
    });

    it("answers an address that already has an account exactly like a new one, and tells the owner by e-mail", async () => {
      const fresh = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: { ...body, email: "someone.new@example.com" } }));
      const owner = await createUser({ email: "new.student@example.com", password: "owner-hash" });
      vi.mocked(sendVerificationEmail).mockClear();
      vi.mocked(sendAccountExistsEmail).mockClear();

      const duplicate = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: body }));

      expect(duplicate.status).toBe(fresh.status);
      expect(await jsonOf(duplicate)).toEqual(await jsonOf(fresh));
      expect(sendAccountExistsEmail).toHaveBeenCalledTimes(1);
      expect(vi.mocked(sendAccountExistsEmail).mock.calls[0]![0]).toMatchObject({ to: "new.student@example.com" });
      expect(sendVerificationEmail).not.toHaveBeenCalled();
      // nothing about the existing account changed
      const row = await prisma.user.findUniqueOrThrow({ where: { id: owner.id } });
      expect(row.password).toBe("owner-hash");
      expect(row.name).toBe(owner.name);
      expect(await prisma.apiRefreshToken.count({ where: { userId: owner.id } })).toBe(0);
    });

    it("the website's registration answers a taken address like a new one too", async () => {
      const webRequest = (email: string) =>
        webRegister(apiRequest("/api/auth/register", { method: "POST", json: { ...body, email } }));
      const fresh = await webRequest("web.new@example.com");
      await createUser({ email: "web.taken@example.com" });
      vi.mocked(sendAccountExistsEmail).mockClear();

      const duplicate = await webRequest("web.taken@example.com");

      expect(fresh.status).toBe(200);
      expect(duplicate.status).toBe(200);
      expect(await jsonOf(duplicate)).toEqual(await jsonOf(fresh));
      expect(sendAccountExistsEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "web.taken@example.com" }));
    });

    it("tells nobody when the address belongs to a removed account", async () => {
      await createUser({ email: "removed@example.com", deletedAt: new Date() });
      vi.mocked(sendAccountExistsEmail).mockClear();

      const response = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: { ...body, email: "removed@example.com" } }));

      expect(response.status).toBe(200);
      expect(sendAccountExistsEmail).not.toHaveBeenCalled();
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

  describe("staff roles need a verified address", () => {
    /** Registers the address and opens an API session on the unverified row, as one issued before registration stopped returning sessions. */
    const registerAs = async (email: string) => {
      const response = await register(
        apiRequest("/api/v1/auth/register", { method: "POST", json: { name: "Claimant", email, password: "long-enough-1", acceptPolicies: true } }),
      );
      expect(response.status).toBe(200);
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      return issueApiSession({ id: user.id, email: user.email, role: "USER" });
    };
    const verify = (email: string) => prisma.user.update({ where: { email }, data: { emailVerified: new Date() } });

    it("an address with a teacher profile acts as USER until verified", async () => {
      await createTeacher({ email: "new.teacher@example.test" });
      const { accessToken, refreshToken } = await registerAs("new.teacher@example.test");

      const before = await teacherCourses(apiRequest("/api/v1/teacher/courses", { headers: bearer(accessToken) }));
      expect(before.status).toBe(403);
      expect((await jsonOf(await me(apiRequest("/api/v1/auth/me", { headers: bearer(accessToken) })))).user.role).toBe("USER");

      // A refreshed pair carries no staff role either.
      const rotated = await jsonOf(await refresh(apiRequest("/api/v1/auth/refresh", { method: "POST", json: { refreshToken } })));
      expect((await teacherCourses(apiRequest("/api/v1/teacher/courses", { headers: bearer(rotated.accessToken) }))).status).toBe(403);

      await verify("new.teacher@example.test");
      expect((await teacherCourses(apiRequest("/api/v1/teacher/courses", { headers: bearer(rotated.accessToken) }))).status).toBe(200);
    });

    it("the ADMIN_EMAIL address acts as USER until verified", async () => {
      const { accessToken } = await registerAs(process.env.ADMIN_EMAIL!);

      expect((await adminDashboard(apiRequest("/api/v1/admin/dashboard", { headers: bearer(accessToken) }))).status).toBe(403);

      await verify(process.env.ADMIN_EMAIL!);
      expect((await adminDashboard(apiRequest("/api/v1/admin/dashboard", { headers: bearer(accessToken) }))).status).toBe(200);
    });
  });

  describe("sessions end when the account is taken back", () => {
    /** Someone else registers the address and holds an API session on the unverified row (one issued before registration stopped returning sessions). */
    const registerSquatter = async (email: string) => {
      await register(
        apiRequest("/api/v1/auth/register", { method: "POST", json: { name: "Squatter", email, password: "long-enough-1", acceptPolicies: true } }),
      );
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      return issueApiSession({ id: user.id, email: user.email, role: "USER" });
    };
    const refreshWith = (refreshToken: string) => refresh(apiRequest("/api/v1/auth/refresh", { method: "POST", json: { refreshToken } }));

    it("a password reset revokes every API session", async () => {
      const { refreshToken, accessToken } = await registerSquatter("reset.me@example.test");
      const token = await createPasswordResetToken("reset.me@example.test");

      const reset = await resetPassword(apiRequest("/api/auth/reset-password", { method: "POST", json: { token, password: "brand-new-pass-1", confirmPassword: "brand-new-pass-1" } }));
      expect(reset.status).toBe(200);

      expect((await refreshWith(refreshToken)).status).toBe(401);
      expect((await me(apiRequest("/api/v1/auth/me", { headers: bearer(accessToken) }))).status).toBe(401);
    });

    it("verifying the address revokes the sessions opened before it", async () => {
      const { refreshToken } = await registerSquatter("verify.me@example.test");
      const { token } = await generateVerificationToken("verify.me@example.test");
      const form = new FormData();
      form.set("token", token);

      expect((await runAction(() => confirmEmailVerification(form))).redirectedTo).toBe("/verify-email?verified=1");
      expect((await refreshWith(refreshToken)).status).toBe(401);
    });

    it("a verification link matches by hash only: the stored value is not itself a token", async () => {
      const user = await createUser({ email: "hash.only@example.test", emailVerified: null });
      await generateVerificationToken(user.email);
      const stored = await prisma.verificationToken.findFirstOrThrow({ where: { identifier: user.email } });
      const form = new FormData();
      form.set("token", stored.token);

      expect((await runAction(() => confirmEmailVerification(form))).redirectedTo).toBe("/verify-email?error=invalid");
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).toBeNull();
    });

    it("mobile Google sign-in on an unverified row revokes the squatter's sessions", async () => {
      process.env.AUTH_GOOGLE_ID = "client-id";
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({ iss: "https://accounts.google.com", aud: "client-id", email: "taken@example.test", email_verified: true, name: "Owner" }),
      });
      const { refreshToken } = await registerSquatter("taken@example.test");

      const owner = await google(apiRequest("/api/v1/auth/google", { method: "POST", json: { idToken: "id-token" } }));
      expect(owner.status).toBe(200);
      const ownerTokens = await jsonOf(owner);

      expect((await refreshWith(refreshToken)).status).toBe(401);
      // The owner's own new session is unaffected.
      expect((await refreshWith(ownerTokens.refreshToken)).status).toBe(200);
    });
  });

  describe("web sessions end on a password reset or change and on a take-over", () => {
    type JwtArgs = Parameters<typeof authJwtCallback>[0];
    /** The web session cookie's token right after a sign-in, as Auth.js builds it. */
    const webSignIn = async (user: { id: string; email: string }) =>
      (await authJwtCallback({ token: { email: user.email }, user: { id: user.id, email: user.email } } as JwtArgs))!;
    /** The same cookie presented on a later request, once its refresh minute has passed. */
    const laterRequest = (token: Awaited<ReturnType<typeof webSignIn>>) =>
      authJwtCallback({ token: { ...token, refreshedAt: 0 } } as JwtArgs);
    const sessionVersionOf = async (email: string) =>
      (await prisma.user.findUniqueOrThrow({ where: { email }, select: { sessionVersion: true } })).sessionVersion;

    it("a password reset ends the web sessions issued before it", async () => {
      const { user } = await createPasswordUser();
      const cookie = await webSignIn(user);
      expect(cookie.sessionVersion).toBe(0);
      expect(await laterRequest(cookie)).not.toBeNull();

      const token = await createPasswordResetToken(user.email);
      const reset = await resetPassword(apiRequest("/api/auth/reset-password", { method: "POST", json: { token, password: "brand-new-pass-1", confirmPassword: "brand-new-pass-1" } }));
      expect(reset.status).toBe(200);

      expect(await sessionVersionOf(user.email)).toBe(1);
      expect(await laterRequest(cookie)).toBeNull();
      // Signing in again starts a session at the new version.
      expect(await laterRequest(await webSignIn(user))).not.toBeNull();
    });

    it("changing the password in the app ends the web sessions", async () => {
      const { user, password } = await createPasswordUser();
      const cookie = await webSignIn(user);
      const { accessToken } = await (await import("@/services/api-auth")).issueApiSession({ id: user.id, email: user.email, role: "USER" });

      const changed = await changePassword(apiRequest("/x", { method: "POST", headers: bearer(accessToken), json: { currentPassword: password, newPassword: "second-password-2" } }));
      expect(changed.status).toBe(200);

      expect(await laterRequest(cookie)).toBeNull();
    });

    it("a deleted account's cookie does not come back when the address is registered again", async () => {
      const { user, password } = await createPasswordUser();
      const cookie = await webSignIn(user);
      expect(await deleteOwnAccount(user.id, { password })).toEqual({ ok: true });

      const again = await register(apiRequest("/api/v1/auth/register", { method: "POST", json: { name: "New Owner", email: user.email, password: "long-enough-1", acceptPolicies: true } }));
      expect(again.status).toBe(200);
      const newOwner = await prisma.user.findUniqueOrThrow({ where: { email: user.email } });
      expect(newOwner.id).not.toBe(user.id);

      expect(await laterRequest(cookie)).toBeNull();
    });

    it("verifying the address and a mobile Google take-over move the version", async () => {
      await register(apiRequest("/api/v1/auth/register", { method: "POST", json: { name: "Squatter", email: "verify.web@example.test", password: "long-enough-1", acceptPolicies: true } }));
      const { token } = await generateVerificationToken("verify.web@example.test");
      const form = new FormData();
      form.set("token", token);
      await runAction(() => confirmEmailVerification(form));
      expect(await sessionVersionOf("verify.web@example.test")).toBe(1);

      process.env.AUTH_GOOGLE_ID = "client-id";
      verifyIdToken.mockResolvedValue({
        getPayload: () => ({ iss: "https://accounts.google.com", aud: "client-id", email: "taken.web@example.test", email_verified: true, name: "Owner" }),
      });
      await register(apiRequest("/api/v1/auth/register", { method: "POST", json: { name: "Squatter", email: "taken.web@example.test", password: "long-enough-1", acceptPolicies: true } }));
      expect((await google(apiRequest("/api/v1/auth/google", { method: "POST", json: { idToken: "id-token" } }))).status).toBe(200);
      expect(await sessionVersionOf("taken.web@example.test")).toBe(1);

      // A verified account signing in with Google again is not a take-over.
      expect((await google(apiRequest("/api/v1/auth/google", { method: "POST", json: { idToken: "id-token" } }))).status).toBe(200);
      expect(await sessionVersionOf("taken.web@example.test")).toBe(1);
    });
  });

  describe("password reset", () => {
    const resetWith = (token: string | null, password = "brand-new-pass-1") =>
      resetPassword(apiRequest("/api/auth/reset-password", { method: "POST", json: { token, password, confirmPassword: password } }));

    it("lets only one of two simultaneous resets with the same link succeed", async () => {
      const { user } = await createPasswordUser();
      const token = await createPasswordResetToken(user.email);

      const statuses = (await Promise.all([resetWith(token, "first-new-pass-1"), resetWith(token, "second-new-pass-1")])).map((r) => r.status);
      expect(statuses.sort()).toEqual([200, 400]);
      expect(await prisma.passwordResetToken.count()).toBe(0);
    });

    it("marks an unverified address verified, so the new password signs in", async () => {
      const { user } = await createPasswordUser("old-password-1", { emailVerified: null });
      const loginAs = (password: string) => login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: user.email, password } }));
      expect((await loginAs("old-password-1")).status).toBe(403);

      expect((await resetWith(await createPasswordResetToken(user.email))).status).toBe(200);

      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).emailVerified).not.toBeNull();
      expect((await loginAs("brand-new-pass-1")).status).toBe(200);
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

    it("prunes the user's expired and long-revoked sessions when a new one starts", async () => {
      const student = await signedInStudent();
      const old = new Date(Date.now() - 30 * 86_400_000);
      await prisma.apiRefreshToken.createMany({
        data: [
          { userId: student.user.id, tokenHash: "expired", expiresAt: old },
          { userId: student.user.id, tokenHash: "revoked-long-ago", expiresAt: new Date(Date.now() + 86_400_000), revokedAt: old },
          { userId: student.user.id, tokenHash: "revoked-recently", expiresAt: new Date(Date.now() + 86_400_000), revokedAt: new Date() },
        ],
      });

      const response = await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken });
      expect(response.status).toBe(200);

      const hashes = (await prisma.apiRefreshToken.findMany({ where: { userId: student.user.id }, select: { tokenHash: true } })).map((r) => r.tokenHash);
      expect(hashes).not.toContain("expired");
      expect(hashes).not.toContain("revoked-long-ago");
      expect(hashes).toContain("revoked-recently");
    });

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
      // the client refreshing twice at once is not a replay: the winner's pair keeps working
      const winner = await jsonOf(results.find((r) => r.status === 200)!);
      expect((await me(apiRequest("/api/v1/auth/me", { headers: bearer(winner.accessToken) }))).status).toBe(200);
      expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: winner.refreshToken })).status).toBe(200);
    });

    describe("reuse of a rotated refresh token", () => {
      const hash = (token: string) => createHash("sha256").update(token).digest("hex");
      /** Moves the revocation of a token past the grace that covers a client's own concurrent refreshes. */
      const ageRevocation = (token: string) =>
        prisma.apiRefreshToken.update({
          where: { tokenHash: hash(token) },
          data: { revokedAt: new Date(Date.now() - REFRESH_REUSE_GRACE_MS - 1000) },
        });

      it("rotation keeps the family, and a replay of the old token ends every token rotated from it", async () => {
        const student = await signedInStudent();
        const other = await issueApiSession({ id: student.user.id, email: student.user.email, role: "USER" });

        const second = await jsonOf(await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken }));
        const third = await jsonOf(await post(refresh, "/api/v1/auth/refresh", { refreshToken: second.refreshToken }));
        const family = await prisma.apiRefreshToken.findMany({
          where: { tokenHash: { in: [student.tokens.refreshToken, second.refreshToken, third.refreshToken].map(hash) } },
          select: { familyId: true },
        });
        expect(family).toHaveLength(3);
        expect(new Set(family.map((r) => r.familyId)).size).toBe(1);
        expect(family[0].familyId).toBeTruthy();

        // someone replays the first token after the legitimate client moved on
        await ageRevocation(student.tokens.refreshToken);
        expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken })).status).toBe(401);

        // the newest pair of that family is dead too
        expect((await me(apiRequest("/api/v1/auth/me", { headers: bearer(third.accessToken) }))).status).toBe(401);
        expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: third.refreshToken })).status).toBe(401);
        // a separate sign-in of the same user is another family and survives
        expect((await me(apiRequest("/api/v1/auth/me", { headers: bearer(other.accessToken) }))).status).toBe(200);
      });

      it("a thief who rotates first loses the chain when the owner presents the old token", async () => {
        const student = await signedInStudent();
        const stolen = await jsonOf(await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken }));

        await ageRevocation(student.tokens.refreshToken);
        expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: student.tokens.refreshToken })).status).toBe(401);

        expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: stolen.refreshToken })).status).toBe(401);
      });

      it("a replayed token issued before families existed ends all of the user's sessions", async () => {
        const student = await signedInStudent();
        await prisma.apiRefreshToken.create({
          data: { userId: student.user.id, tokenHash: hash("legacy-rotated"), expiresAt: new Date(Date.now() + 86_400_000), revokedAt: new Date(Date.now() - 60_000) },
        });

        expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: "legacy-rotated" })).status).toBe(401);

        expect((await me(apiRequest("/api/v1/auth/me", { headers: student.headers }))).status).toBe(401);
        expect(await prisma.apiRefreshToken.count({ where: { userId: student.user.id, revokedAt: null } })).toBe(0);
      });

      it("a live token issued before families existed starts a family when it rotates", async () => {
        const student = await signedInStudent();
        const legacy = await prisma.apiRefreshToken.create({
          data: { userId: student.user.id, tokenHash: hash("legacy-live"), expiresAt: new Date(Date.now() + 86_400_000) },
        });

        const next = await jsonOf(await post(refresh, "/api/v1/auth/refresh", { refreshToken: "legacy-live" }));
        expect((await prisma.apiRefreshToken.findUniqueOrThrow({ where: { id: legacy.id } })).familyId).toBe(legacy.id);
        expect((await prisma.apiRefreshToken.findUniqueOrThrow({ where: { tokenHash: hash(next.refreshToken) } })).familyId).toBe(legacy.id);

        // its replay is then confined to that family
        await ageRevocation("legacy-live");
        expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: "legacy-live" })).status).toBe(401);
        expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: next.refreshToken })).status).toBe(401);
        expect((await me(apiRequest("/api/v1/auth/me", { headers: student.headers }))).status).toBe(200);
      });

      it("a token ended by logout presented again does not end the user's other sessions", async () => {
        const first = await signedInStudent();
        const second = await issueApiSession({ id: first.user.id, email: first.user.email, role: "USER" });
        await post(logout, "/api/v1/auth/logout", { refreshToken: first.tokens.refreshToken });
        await ageRevocation(first.tokens.refreshToken);

        expect((await post(refresh, "/api/v1/auth/refresh", { refreshToken: first.tokens.refreshToken })).status).toBe(401);
        expect((await me(apiRequest("/api/v1/auth/me", { headers: bearer(second.accessToken) }))).status).toBe(200);
      });
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
