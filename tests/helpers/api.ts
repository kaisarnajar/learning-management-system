import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { NextRequest } from "next/server";
import { issueApiSession, type ApiSessionTokens } from "@/services/api-auth";
import { createUser } from "./db";

type RequestOptions = {
  method?: string;
  headers?: Record<string, string>;
  json?: unknown;
  body?: BodyInit;
  /** Client address; unique per request by default so rate limits do not leak between tests. */
  ip?: string;
};

/** A request to one of the app's own routes, built the way Next hands it to a route handler. */
export function apiRequest(path: string, options: RequestOptions = {}): NextRequest {
  const headers = new Headers(options.headers);
  if (!headers.has("x-forwarded-for")) headers.set("x-forwarded-for", options.ip ?? `10.0.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`);
  let body = options.body;
  if (options.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.json);
  }
  return new NextRequest(new URL(path, "http://localhost:3000"), { method: options.method ?? "GET", headers, body });
}

export const bearer = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

/** Parsed response body; deliberately loose so assertions can read nested fields without casts. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = Record<string, any>;

export async function jsonOf(response: Response): Promise<Json> {
  return (await response.json()) as Json;
}

/** A route's second argument for dynamic segments like `[id]`. */
export const routeParams = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

export const PROFILE_FIELDS = {
  fatherName: "Imran Khan",
  dateOfBirth: new Date("2000-01-15"),
  occupation: "STUDENT" as const,
  address: "12 Main Street, Srinagar",
  whatsapp: "9876543210",
  gender: "FEMALE" as const,
};

/** A verified student with a complete profile who is signed in to the mobile API. */
export async function signedInStudent(overrides: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser({ ...PROFILE_FIELDS, ...overrides });
  const tokens: ApiSessionTokens = await issueApiSession({ id: user.id, email: user.email, name: user.name, role: "USER" });
  return { user, tokens, headers: bearer(tokens.accessToken) };
}

/** A verified account that can sign in with a password. */
export async function createPasswordUser(password = "correct-horse-1", overrides: Parameters<typeof createUser>[0] = {}) {
  const user = await createUser({ password: await hash(password, 4), email: `pw-${randomUUID().slice(0, 8)}@example.test`, ...overrides });
  return { user, password };
}
