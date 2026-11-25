import { afterEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { prisma } from "@/utils/prisma";
import { findFatwaAnswererContact } from "@/services/fatwa";
import { getTeacherForSession } from "@/services/teacher-auth";

// tests/helpers/unit-setup.ts replaces the client with an empty object; each
// test installs the delegates it needs.
const db = prisma as unknown as Record<string, Record<string, unknown>>;

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of Object.keys(db)) delete db[key];
});

describe("database errors that do not fail the request are logged", () => {
  it("a failed lookup of the answering teacher is logged and answers null", async () => {
    const failure = new Error("connection reset");
    db.user = { findUnique: vi.fn(() => Promise.reject(failure)) };
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(findFatwaAnswererContact("user-1")).resolves.toBeNull();
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("[fatwa]"), failure);
  });

  it("a failed self-heal of the teacher link is logged and the teacher is still found", async () => {
    const teacher = { id: "teacher-1", email: "t@example.test", userId: null };
    db.teacher = {
      findUnique: vi.fn(({ where }: { where: { userId?: string; email?: string } }) => Promise.resolve(where.email ? teacher : null)),
      updateMany: vi.fn(() => Promise.reject(new Error("deadlock detected"))),
    };
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const session = { user: { id: "user-1", email: "t@example.test", role: "TEACHER" } } as unknown as Session;

    await expect(getTeacherForSession(session)).resolves.toBe(teacher);
    expect(logged).toHaveBeenCalledWith(expect.stringContaining("[teacher-auth]"), expect.anything());
  });
});
