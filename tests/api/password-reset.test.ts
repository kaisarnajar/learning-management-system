import { beforeEach, describe, expect, it, vi } from "vitest";
import { compare } from "bcryptjs";
import { prisma } from "@/utils/prisma";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { createPasswordResetToken, hashResetToken } from "@/services/password-reset";
import { sendPasswordResetEmail } from "@/services/email";
import { resetDb, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, createPasswordUser, jsonOf } from "../helpers/api";

const forgot = (email: string) => forgotPassword(apiRequest("/api/auth/forgot-password", { method: "POST", json: { email } }));
const resetWith = (token: string, password = "brand-new-pass-1", confirmPassword = password) =>
  resetPassword(apiRequest("/api/auth/reset-password", { method: "POST", json: { token, password, confirmPassword } }));
const loginAs = (email: string, password: string) => login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email, password } }));

/** The token carried by the link in the last reset e-mail (the e-mail sender is stubbed). */
function tokenFromLastEmail(): string {
  const { resetUrl } = vi.mocked(sendPasswordResetEmail).mock.calls.at(-1)![0] as { resetUrl: string };
  return new URL(resetUrl).searchParams.get("token")!;
}

describe.skipIf(SKIP_WITHOUT_DB)("password reset (/api/auth/forgot-password, /api/auth/reset-password)", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(sendPasswordResetEmail).mockClear();
  });

  describe("requesting a link", () => {
    it("e-mails a link for a known address and answers an unknown one identically", async () => {
      const { user } = await createPasswordUser();

      const known = await forgot(user.email.toUpperCase());
      const unknown = await forgot("nobody@example.test");
      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      const [knownBody, unknownBody] = [await jsonOf(known), await jsonOf(unknown)];
      expect(knownBody.message).toBe(unknownBody.message);

      expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
      expect(vi.mocked(sendPasswordResetEmail).mock.calls[0]![0]).toMatchObject({ to: user.email });
      // Only a hash is stored; the link's token never is.
      const row = await prisma.passwordResetToken.findFirstOrThrow({ where: { email: user.email } });
      expect(row.tokenHash).toBe(hashResetToken(tokenFromLastEmail()));
      expect(row.tokenHash).not.toBe(tokenFromLastEmail());
    });

    it("a new link replaces the previous one", async () => {
      const { user } = await createPasswordUser();
      await forgot(user.email);
      const first = tokenFromLastEmail();
      await forgot(user.email);
      const second = tokenFromLastEmail();

      expect(await prisma.passwordResetToken.count({ where: { email: user.email } })).toBe(1);
      expect((await resetWith(first)).status).toBe(400);
      expect((await resetWith(second)).status).toBe(200);
    });

    it("rejects a malformed address", async () => {
      expect((await forgot("not-an-email")).status).toBe(400);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe("using a link", () => {
    it("sets the new password and spends the link", async () => {
      const { user, password } = await createPasswordUser();
      const token = (await createPasswordResetToken(user.email))!;

      const response = await resetWith(token);
      expect(response.status).toBe(200);
      expect(await jsonOf(response)).toEqual({ success: true });

      const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(await compare("brand-new-pass-1", stored.password!)).toBe(true);
      expect((await loginAs(user.email, password)).status).toBe(401);
      expect((await loginAs(user.email, "brand-new-pass-1")).status).toBe(200);
      expect(await prisma.passwordResetToken.count()).toBe(0);
    });

    it("refuses a link that was already used", async () => {
      const { user } = await createPasswordUser();
      const token = (await createPasswordResetToken(user.email))!;
      expect((await resetWith(token, "first-new-pass-1")).status).toBe(200);

      const again = await resetWith(token, "second-new-pass-1");
      expect(again.status).toBe(400);
      expect(await jsonOf(again)).toEqual({ success: false, error: "Reset link is invalid or has expired." });
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(await compare("first-new-pass-1", stored.password!)).toBe(true);
    });

    it("refuses an expired link and removes it", async () => {
      const { user } = await createPasswordUser();
      const token = (await createPasswordResetToken(user.email))!;
      await prisma.passwordResetToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });

      const response = await resetWith(token);
      expect(response.status).toBe(400);
      expect(await jsonOf(response)).toEqual({ success: false, error: "Reset link is invalid or has expired." });
      expect(await prisma.passwordResetToken.count()).toBe(0);
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(await compare("brand-new-pass-1", stored.password!)).toBe(false);
    });

    it("refuses an unknown or empty token, and a password the form would reject", async () => {
      const { user } = await createPasswordUser();
      const token = (await createPasswordResetToken(user.email))!;

      expect((await resetWith("0".repeat(64))).status).toBe(400);
      expect((await resetWith("   ")).status).toBe(400);
      expect((await resetWith(token, "short")).status).toBe(400);
      expect((await resetWith(token, "brand-new-pass-1", "something-else-1")).status).toBe(400);
      // None of the refused attempts spent the real link.
      expect((await resetWith(token)).status).toBe(200);
    });
  });
});
