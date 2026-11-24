import { beforeEach, describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/v1/auth/login/route";
import { POST as changePassword } from "@/app/api/v1/auth/change-password/route";
import { POST as unsubscribe } from "@/app/api/email/unsubscribe/route";
import { POST as forgotPassword } from "@/app/api/auth/forgot-password/route";
import { buildUnsubscribeToken } from "@/services/email-unsubscribe";
import { RATE_LIMITS } from "@/services/rate-limit";
import { createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, bearerFor, createPasswordUser } from "../helpers/api";

const loginFrom = (ip: string, email: string, password: string) =>
  login(apiRequest("/api/v1/auth/login", { method: "POST", json: { email, password }, ip }));

/** Which attempts count toward the sign-in limits, and which buckets are shared (review L1, L2). */
describe.skipIf(SKIP_WITHOUT_DB)("sign-in and account rate limits", () => {
  beforeEach(resetDb);

  it("never counts a successful sign-in", async () => {
    const { user, password } = await createPasswordUser();

    for (let i = 0; i < RATE_LIMITS.LOGIN_FAILURE.limit + 2; i++) {
      expect((await loginFrom("10.20.0.1", user.email, password)).status).toBe(200);
    }
  });

  it("locks an address only on the network its failures came from", async () => {
    const { user, password } = await createPasswordUser();

    for (let i = 0; i < RATE_LIMITS.LOGIN_FAILURE.limit; i++) {
      expect((await loginFrom("10.21.0.1", user.email, "wrong-password")).status).toBe(401);
    }
    // The guessing network is stopped, even with the right password...
    const blocked = await loginFrom("10.21.0.1", user.email, password);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    // ...and the owner elsewhere still signs in.
    expect((await loginFrom("10.21.0.2", user.email, password)).status).toBe(200);
  });

  it("counts an unknown address as a failure too", async () => {
    for (let i = 0; i < RATE_LIMITS.LOGIN_FAILURE.limit; i++) {
      expect((await loginFrom("10.22.0.1", "nobody@example.test", "whatever-1")).status).toBe(401);
    }
    expect((await loginFrom("10.22.0.1", "nobody@example.test", "whatever-1")).status).toBe(429);
  });

  it("wrong current passwords in change-password do not use up sign-in attempts", async () => {
    const { user, password } = await createPasswordUser();
    const headers = await bearerFor(user);

    const statuses: number[] = [];
    for (let i = 0; i < RATE_LIMITS.CHANGE_PASSWORD.limit + 1; i++) {
      const response = await changePassword(
        apiRequest("/api/v1/auth/change-password", {
          method: "POST",
          headers,
          json: { currentPassword: "not-my-password", newPassword: "brand-new-pass-1" },
          ip: "10.23.0.1",
        }),
      );
      statuses.push(response.status);
    }
    expect(statuses.slice(0, -1).every((status) => status === 403)).toBe(true);
    expect(statuses.at(-1)).toBe(429);

    expect((await loginFrom("10.23.0.1", user.email, password)).status).toBe(200);
  });

  it("unsubscribing does not use up a network's password-reset requests", async () => {
    const ip = "10.24.0.1";
    for (let i = 0; i < 10; i++) {
      const token = buildUnsubscribeToken((await createUser()).id);
      const response = await unsubscribe(
        apiRequest(`/api/email/unsubscribe?token=${encodeURIComponent(token)}`, { method: "POST", ip }),
      );
      expect(response.status).toBe(200);
    }

    const reset = await forgotPassword(apiRequest("/api/auth/forgot-password", { method: "POST", json: { email: "someone@example.test" }, ip }));
    expect(reset.status).toBe(200);
  });
});
