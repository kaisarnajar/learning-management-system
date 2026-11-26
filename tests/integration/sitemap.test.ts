import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CourseStatus } from "@prisma/client";
import { prisma } from "@/utils/prisma";
import sitemap from "@/app/sitemap";
import { createCourse, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";

/** app/sitemap.ts lists every public course and never caches a partial sitemap (L21, X5). */
describe.skipIf(SKIP_WITHOUT_DB)("sitemap", () => {
  beforeEach(resetDb);

  it("lists only public courses (not draft, on hold or completed)", async () => {
    const statuses: CourseStatus[] = ["PUBLISHED", "ONGOING", "COMPLETED", "COMING_SOON", "ON_HOLD", "DRAFT"];
    const courses = Object.fromEntries(
      await Promise.all(statuses.map(async (status) => [status, (await createCourse({ status })).id] as const)),
    );

    const urls = (await sitemap()).map((entry) => entry.url);
    const listed = (id: string) => urls.some((url) => url.endsWith(`/courses/${id}`));

    for (const status of ["PUBLISHED", "ONGOING", "COMING_SOON"]) expect(listed(courses[status])).toBe(true);
    for (const status of ["COMPLETED", "ON_HOLD", "DRAFT"]) expect(listed(courses[status])).toBe(false);
  });

  it("fails on a database error instead of returning only the static pages", async () => {
    const spy = vi.spyOn(prisma.course, "findMany").mockRejectedValueOnce(new Error("database down"));
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(sitemap()).rejects.toThrow("database down");

    spy.mockRestore();
    quiet.mockRestore();
  });

  it("falls back to the static pages only while the app is being built", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build");
    const spy = vi.spyOn(prisma.course, "findMany").mockRejectedValueOnce(new Error("no schema yet"));
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const urls = (await sitemap()).map((entry) => entry.url);
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.some((url) => url.includes("/courses/"))).toBe(false);

    spy.mockRestore();
    quiet.mockRestore();
    vi.unstubAllEnvs();
  });
});
