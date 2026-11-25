import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/utils/prisma";
import { GET as showUnsubscribe, POST as unsubscribe } from "@/app/api/email/unsubscribe/route";
import { buildUnsubscribeToken, buildUnsubscribeUrl } from "@/services/email-unsubscribe";
import { createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, jsonOf } from "../helpers/api";

const path = (token: string) => `/api/email/unsubscribe?token=${encodeURIComponent(token)}`;
const optedOut = async (userId: string) => (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).announcementEmailsOptOut;

/** The RFC 8058 one-click request a mail client sends. */
const oneClick = (token: string) =>
  unsubscribe(
    apiRequest(path(token), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "List-Unsubscribe=One-Click",
    }),
  );

describe.skipIf(SKIP_WITHOUT_DB)("/api/email/unsubscribe", () => {
  beforeEach(resetDb);

  it("GET only shows a confirmation page, however often it is opened", async () => {
    const user = await createUser();
    const token = buildUnsubscribeToken(user.id);

    for (let i = 0; i < 3; i++) {
      const response = await showUnsubscribe(apiRequest(path(token)));
      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.text()).toContain('<form method="post">');
    }
    // A mail scanner following the link must not opt anyone out.
    expect(await optedOut(user.id)).toBe(false);
  });

  it("POST from the confirmation page opts the user out, and repeating it is harmless", async () => {
    const user = await createUser();
    const other = await createUser();
    const form = new FormData();
    form.set("token", buildUnsubscribeToken(user.id));

    for (let i = 0; i < 2; i++) {
      const response = await unsubscribe(
        apiRequest("/api/email/unsubscribe", { method: "POST", headers: { referer: "http://localhost:3000/api/email/unsubscribe" }, body: form }),
      );
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("You are unsubscribed");
    }
    expect(await optedOut(user.id)).toBe(true);
    expect(await optedOut(other.id)).toBe(false);
  });

  it("a one-click POST with the token in the URL answers JSON", async () => {
    const user = await createUser();
    const token = new URL(buildUnsubscribeUrl(user.id)).searchParams.get("token")!;

    const response = await oneClick(token);
    expect(response.status).toBe(200);
    expect(await jsonOf(response)).toEqual({ success: true });
    expect(await optedOut(user.id)).toBe(true);
  });

  it("refuses a missing, altered or forged token on GET and POST", async () => {
    const victim = await createUser();
    const attacker = await createUser();
    const genuine = buildUnsubscribeToken(attacker.id);
    const signature = genuine.slice(genuine.lastIndexOf(".") + 1);

    const bad = [
      "",
      victim.id,
      `${victim.id}.${signature}`, // another user's signature
      `${victim.id}.${"0".repeat(signature.length)}`,
      `${victim.id}.${signature.slice(0, -2)}`, // wrong length
      `.${signature}`,
      `${genuine}x`,
    ];
    for (const token of bad) {
      expect((await showUnsubscribe(apiRequest(path(token)))).status, token).toBe(400);
      expect((await oneClick(token)).status, token).toBe(400);
    }
    expect(await optedOut(victim.id)).toBe(false);
    expect(await optedOut(attacker.id)).toBe(false);
  });

  it("leaves a removed account alone", async () => {
    const user = await createUser({ deletedAt: new Date() });
    expect((await oneClick(buildUnsubscribeToken(user.id))).status).toBe(200);
    expect(await optedOut(user.id)).toBe(false);
  });
});
