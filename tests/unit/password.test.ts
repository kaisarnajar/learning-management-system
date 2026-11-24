import { describe, expect, it, vi } from "vitest";

vi.mock("bcryptjs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("bcryptjs")>();
  return { ...actual, compare: vi.fn(actual.compare) };
});

import { compare, hash } from "bcryptjs";
import { verifyPassword } from "@/services/password";

/** Sign-in does the same bcrypt work whether or not the account exists. */
describe("verifyPassword", () => {
  it("checks a password against the stored hash", async () => {
    const stored = await hash("correct horse", 4);
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("wrong horse", stored)).toBe(false);
  });

  it.each([null, undefined, ""])("without a stored hash (%s) still runs a cost-12 comparison and refuses", async (stored) => {
    vi.mocked(compare).mockClear();

    expect(await verifyPassword("anything", stored)).toBe(false);

    expect(compare).toHaveBeenCalledTimes(1);
    const dummy = vi.mocked(compare).mock.calls[0]![1];
    expect(dummy).toMatch(/^\$2[aby]\$12\$/);
  });
});
