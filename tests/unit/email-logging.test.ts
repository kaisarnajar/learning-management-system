import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/services/email";
import { redactLinkTokens } from "@/services/email/core";

const TOKEN = "live-token-3f9a2c7d1e";

describe("e-mail logging without SMTP", () => {
  let logged: () => string;

  beforeEach(() => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");
    const spies = (["info", "log", "warn", "error", "debug"] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => undefined),
    );
    logged = () => spies.flatMap((spy) => spy.mock.calls.map((call) => call.map(String).join(" "))).join("\n");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const sendBoth = async () => {
    const verification = await sendVerificationEmail({ to: "student@example.org", verificationUrl: `https://academy.example/verify-email?token=${TOKEN}` });
    const reset = await sendPasswordResetEmail({ to: "student@example.org", resetUrl: `https://academy.example/reset-password?token=${TOKEN}&x=1` });
    expect(verification).toEqual({ sent: false, skipped: true });
    expect(reset).toEqual({ sent: false, skipped: true });
  };

  it("in production logs only the subject and the recipient's domain", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await sendBoth();

    expect(logged()).not.toContain(TOKEN);
    expect(logged()).not.toContain("student@example.org");
    expect(logged()).not.toContain("academy.example/");
    expect(logged()).toContain("example.org");
  });

  it("outside production shows the link with the token redacted", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await sendBoth();

    expect(logged()).not.toContain(TOKEN);
    expect(logged()).toContain("https://academy.example/verify-email?token=[redacted]");
    expect(logged()).toContain("https://academy.example/reset-password?token=[redacted]&x=1");
  });

  it("redacts every token parameter, whatever its position or case", () => {
    expect(redactLinkTokens("https://a.example/p?x=1&TOKEN=abc#top and /q?token=def")).toBe(
      "https://a.example/p?x=1&TOKEN=[redacted]#top and /q?token=[redacted]",
    );
    expect(redactLinkTokens("https://a.example/p?notoken=1")).toBe("https://a.example/p?notoken=1");
  });
});
