import { vi } from "vitest";

// Point the app's Prisma client at the disposable database before anything
// imports it. When DATABASE_URL_TEST is missing the suites skip themselves;
// the placeholder only keeps module loading from failing.
const testUrl = process.env.DATABASE_URL_TEST;
process.env.DATABASE_URL = testUrl ?? "postgresql://skip:skip@127.0.0.1:1/skip";
process.env.DIRECT_URL = testUrl ? (process.env.DIRECT_URL_TEST ?? testUrl) : process.env.DATABASE_URL;
process.env.ADMIN_EMAIL = "admin@example.test";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-0123456789";
process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";

// Next's request-scoped helpers have no request to attach to under Vitest.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_noStore: vi.fn(),
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    // Run the deferred work right away, like the fallback in notifications.ts.
    after: (task: (() => unknown) | Promise<unknown>) => {
      Promise.resolve()
        .then(() => (typeof task === "function" ? task() : task))
        .catch(() => undefined);
    },
  };
});

// Auth.js is replaced by a controllable session: tests call
// `vi.mocked(auth).mockResolvedValue(sessionFor(user))`.
vi.mock("@/services/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Never send real mail; every sender reports "skipped".
vi.mock("@/services/email", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed = Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === "function" && name.startsWith("send") ? vi.fn(async () => ({ sent: false, skipped: true })) : value,
    ]),
  );
  return stubbed;
});
