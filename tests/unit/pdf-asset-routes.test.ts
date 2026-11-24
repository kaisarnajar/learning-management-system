import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import { PDF_ASSET_FILES, PDF_ASSET_ROUTE_GLOBS } from "@/config/pdf-asset-routes";

// The matcher Next itself applies to outputFileTracingIncludes keys (next/dist/build/collect-build-traces.js).
type Picomatch = (glob: string, options: { dot: boolean; contains: boolean }) => (path: string) => boolean;
const picomatch = createRequire(import.meta.url)("next/dist/compiled/picomatch") as Picomatch;

const carriesPdfAssets = (route: string) =>
  Object.entries(nextConfig.outputFileTracingIncludes ?? {}).some(
    ([glob, files]) => picomatch(glob, { dot: true, contains: true })(route) && files.includes("./public/fonts/**/*"),
  );

describe("PDF assets in the serverless traces", () => {
  it("are attached through the route list, not to every route", () => {
    expect(Object.keys(nextConfig.outputFileTracingIncludes ?? {})).toEqual([...PDF_ASSET_ROUTE_GLOBS]);
    expect(PDF_ASSET_FILES).toEqual(expect.arrayContaining(["./public/fonts/**/*", "./generated/**/*"]));
  });

  it.each([
    "/api/receipt/[paymentRecordId]",
    "/api/certificate/[enrollmentId]",
    "/api/id-card",
    "/api/student-card/[kind]",
    "/api/v1/payments/[id]/receipt",
    "/api/v1/admin/receipts/[id]/pdf",
    "/api/v1/admin/certificates/[enrollmentId]/email",
    "/api/v1/admin/students/[id]/id-card",
    "/api/v1/admin/courses/[id]/grades/student/[enrollmentId]/card",
    "/api/v1/teacher/courses/[id]/attendance/students",
    "/admin/receipts/[paymentRecordId]",
    "/admin/certificates/new",
    "/admin/payments",
    "/admin/students/[id]/id-card",
    "/admin/courses/[id]/attendance/student/[enrollmentId]/attendance-card",
    "/admin/courses/[id]/grades/student/[enrollmentId]/grade-card",
  ])("reach %s, which renders PDFs", (route) => {
    expect(carriesPdfAssets(route)).toBe(true);
  });

  it.each([
    "/",
    "/courses",
    "/courses/[id]",
    "/profile/payments",
    "/admin/students/[id]",
    "/admin/courses/[id]/attendance/student/[enrollmentId]",
    "/api/attendance-card",
    "/api/v1/courses",
    "/api/v1/auth/login",
    "/api/v1/admin/courses",
    "/api/v1/admin/courses/new",
    "/api/files/[...key]",
  ])("stay out of %s", (route) => {
    expect(carriesPdfAssets(route)).toBe(false);
  });
});
