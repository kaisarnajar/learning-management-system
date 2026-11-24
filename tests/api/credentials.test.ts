import { beforeEach, describe, expect, it } from "vitest";
import { authenticateCredentials } from "@/services/credentials";
import { RATE_LIMITS } from "@/services/rate-limit";
import { LOGIN_PASSWORD_MAX_LENGTH } from "@/utils/validations";
import { createPasswordUser } from "../helpers/api";
import { resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

// The check behind both the website's Credentials sign-in (services/auth.ts)
// and POST /api/v1/auth/login.
describe.skipIf(SKIP_WITHOUT_DB)("authenticateCredentials", () => {
  beforeEach(resetDb);

  it("accepts a verified account, with the address in any case and spacing", async () => {
    const { user, password } = await createPasswordUser();
    const result = await authenticateCredentials(`  ${user.email.toUpperCase()} `, password, "10.40.0.1");
    expect(result).toMatchObject({ ok: true, user: { id: user.id, email: user.email } });
    expect(JSON.stringify(result)).not.toContain("password");
  });

  it("answers INVALID for a wrong password, an unknown or removed account and an overlong password", async () => {
    const { user, password } = await createPasswordUser();
    const removed = await createPasswordUser("removed-pass-1", { deletedAt: new Date() });
    const ip = "10.40.0.2";
    expect(await authenticateCredentials(user.email, "wrong-password", ip)).toEqual({ ok: false, reason: "INVALID" });
    expect(await authenticateCredentials("nobody@example.test", password, ip)).toEqual({ ok: false, reason: "INVALID" });
    expect(await authenticateCredentials(removed.user.email, removed.password, ip)).toEqual({ ok: false, reason: "INVALID" });
    expect(await authenticateCredentials(user.email, "x".repeat(LOGIN_PASSWORD_MAX_LENGTH + 1), ip)).toEqual({ ok: false, reason: "INVALID" });
  });

  it("tells an unverified address apart only once the password is right", async () => {
    const { user, password } = await createPasswordUser("correct-horse-1", { emailVerified: null });
    expect(await authenticateCredentials(user.email, "wrong-password", "10.40.0.3")).toEqual({ ok: false, reason: "INVALID" });
    expect(await authenticateCredentials(user.email, password, "10.40.0.3")).toMatchObject({ ok: false, reason: "EMAIL_NOT_VERIFIED", user: { id: user.id } });
  });

  it("stops an address after repeated failures from one network", async () => {
    const { user, password } = await createPasswordUser();
    for (let i = 0; i < RATE_LIMITS.LOGIN_FAILURE.limit; i++) {
      await authenticateCredentials(user.email, "wrong-password", "10.40.0.4");
    }
    expect(await authenticateCredentials(user.email, password, "10.40.0.4")).toMatchObject({ ok: false, reason: "RATE_LIMITED" });
    expect(await authenticateCredentials(user.email, password, "10.40.0.5")).toMatchObject({ ok: true });
  });
});
