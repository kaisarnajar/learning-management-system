import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { POST as resetPassword } from "@/app/api/auth/reset-password/route";
import { POST as webRegister } from "@/app/api/auth/register/route";
import { POST as resendVerification } from "@/app/api/auth/resend-verification/route";
import { POST as mobileLogin } from "@/app/api/v1/auth/login/route";
import { resetDb, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, jsonOf } from "../helpers/api";

vi.mock("@/services/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/auth")>()),
  auth: vi.fn(async () => null),
}));

/**
 * The website's /api/auth routes used to answer `{ error }` only; they now
 * share the mobile envelope (`success: false` added, `error` unchanged).
 */
describe.skipIf(SKIP_WITHOUT_DB)("every API error carries success: false", () => {
  beforeEach(async () => {
    await resetDb();
  });

  const cases = [
    ["web forgot-password, invalid e-mail", () => forgotPassword(apiRequest("/api/auth/forgot-password", { method: "POST", json: { email: "nope" } })), 400],
    ["web reset-password, unknown token", () => resetPassword(apiRequest("/api/auth/reset-password", { method: "POST", json: { token: "x".repeat(64), password: "Str0ng-Password!", confirmPassword: "Str0ng-Password!" } })), 400],
    ["web register, invalid details", () => webRegister(apiRequest("/api/auth/register", { method: "POST", json: { email: "nope" } })), 400],
    ["web resend-verification, no e-mail", () => resendVerification(apiRequest("/api/auth/resend-verification", { method: "POST", json: {} })), 400],
    ["mobile login, missing password", () => mobileLogin(apiRequest("/api/v1/auth/login", { method: "POST", json: { email: "a@example.test" } })), 400],
  ] as const;

  for (const [name, call, status] of cases) {
    it(name, async () => {
      const response = await call();
      expect(response.status).toBe(status);
      const body = await jsonOf(response);
      expect(body.success).toBe(false);
      expect(typeof body.error).toBe("string");
      expect(body.error.length).toBeGreaterThan(0);
    });
  }
});
