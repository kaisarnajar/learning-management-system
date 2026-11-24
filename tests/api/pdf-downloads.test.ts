import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "@/services/auth";
import { generateIdCardPdf } from "@/utils/id-card-html";
import { GET as adminIdCard } from "@/app/api/v1/admin/students/[id]/id-card/route";
import { GET as webIdCard } from "@/app/api/id-card/route";
import { createUser, PROFILE_FIELDS, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, routeParams, signedInAdmin } from "../helpers/api";

// Chromium is not needed to check the response around the PDF.
vi.mock("@/utils/id-card-html", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  generateIdCardPdf: vi.fn(async () => Buffer.from("%PDF-1.4 test")),
}));

const utf8NameOf = (header: string | null) => decodeURIComponent(/filename\*=UTF-8''([^;]+)/.exec(header ?? "")?.[1] ?? "");

/** PDF routes answer with safe headers for any student name (review L8). */
describe.skipIf(SKIP_WITHOUT_DB)("PDF downloads", () => {
  beforeEach(async () => {
    await resetDb();
    vi.mocked(auth).mockResolvedValue(null as never);
    vi.mocked(generateIdCardPdf).mockClear();
  });

  it("the staff API serves the ID card of an Arabic-named student with an RFC 5987 filename", async () => {
    const admin = await signedInAdmin();
    const student = await createUser({ ...PROFILE_FIELDS, name: "عبد الله \"الأول\"" });

    const response = await adminIdCard(apiRequest(`/api/v1/admin/students/${student.id}/id-card`, { headers: admin.headers }), routeParams({ id: student.id }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    const disposition = response.headers.get("content-disposition");
    expect(disposition).toMatch(/^inline; filename="ID_Card\.pdf"; filename\*=UTF-8''/);
    expect(utf8NameOf(disposition)).toBe("ID Card عبد الله الأول.pdf");
  });

  it("the website ID card needs a complete profile, like the staff API", async () => {
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    const incomplete = await createUser({ name: "محمد" });
    const complete = await createUser({ ...PROFILE_FIELDS, name: "محمد" });

    const refused = await webIdCard(apiRequest(`/api/id-card?userId=${incomplete.id}`));
    expect(refused.status).toBe(409);
    expect(generateIdCardPdf).not.toHaveBeenCalled();

    const ok = await webIdCard(apiRequest(`/api/id-card?userId=${complete.id}`));
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("private, no-store");
    expect(utf8NameOf(ok.headers.get("content-disposition"))).toBe("ID Card محمد.pdf");
  });

  it("a rendering failure on the website ID card is a 500 with a message, not an unhandled error", async () => {
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    const student = await createUser({ ...PROFILE_FIELDS });
    vi.mocked(generateIdCardPdf).mockRejectedValueOnce(new Error("chromium crashed"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await webIdCard(apiRequest(`/api/id-card?userId=${student.id}`));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to generate the ID card." });
  });
});
