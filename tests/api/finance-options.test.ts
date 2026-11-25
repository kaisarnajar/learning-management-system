import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { auth } from "@/services/auth";
import { GET as financeOptions } from "@/app/api/v1/admin/finance/options/route";
import FeeWaiverFinancePage from "@/app/admin/coupons/finance/page";
import { getWaiverRequestsPaginated } from "@/services/coupons-admin";
import { searchStudentOptionsAction } from "@/app/admin/students/actions";
import { prisma } from "@/utils/prisma";
import { createCourse, createUser, resetDb, sessionFor, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, jsonOf, signedInAdmin, signedInStudent } from "../helpers/api";

describe.skipIf(SKIP_WITHOUT_DB)("bounded student pickers and waiver request lists", () => {
  beforeEach(resetDb);

  it("students=all returns at most 50 students with only id, name and e-mail", async () => {
    const admin = await signedInAdmin();
    await Promise.all(Array.from({ length: 55 }, () => createUser()));

    const response = await financeOptions(apiRequest("/api/v1/admin/finance/options?students=all", { headers: admin.headers }));
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    expect(body.students).toHaveLength(50);
    expect(Object.keys(body.students[0]).sort()).toEqual(["email", "id", "name"]);
    expect(body.students.some((s: { email: string }) => s.email === admin.user.email)).toBe(false);
  });

  it("q narrows students=all by name, e-mail or registration number", async () => {
    const admin = await signedInAdmin();
    await Promise.all(Array.from({ length: 10 }, () => createUser()));
    const zainab = await createUser({ name: "Zainab Qureshi" });
    const byRegNo = await createUser({ registrationNumber: "DQA-2026-0777" });

    const byName = await jsonOf(await financeOptions(apiRequest("/api/v1/admin/finance/options?students=all&q=zainab", { headers: admin.headers })));
    expect(byName.students.map((s: { id: string }) => s.id)).toEqual([zainab.id]);

    const reg = await jsonOf(await financeOptions(apiRequest("/api/v1/admin/finance/options?students=all&q=0777", { headers: admin.headers })));
    expect(reg.students.map((s: { id: string }) => s.id)).toEqual([byRegNo.id]);
  });

  it("refuses a student", async () => {
    const { headers } = await signedInStudent();
    expect((await financeOptions(apiRequest("/api/v1/admin/finance/options?students=all", { headers }))).status).toBe(403);
  });

  it("the picker's search action returns at most 20 matches and requires an admin", async () => {
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    await Promise.all(Array.from({ length: 25 }, (_, i) => createUser({ name: `Bilal ${i}` })));

    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);
    const results = await searchStudentOptionsAction("bilal");
    expect(results).toHaveLength(20);
    expect(Object.keys(results[0]).sort()).toEqual(["email", "id", "name"]);

    vi.mocked(auth).mockResolvedValue(null as never);
    await expect(searchStudentOptionsAction("bilal")).rejects.toMatchObject({ digest: expect.stringMatching(/^NEXT_REDIRECT/) });
  });

  it("the fee-waiver finance page renders with a search box and the selected student", async () => {
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    const selected = await createUser({ name: "Maryam Siddiqui" });
    vi.mocked(auth).mockResolvedValue(sessionFor(admin, "ADMIN") as never);

    const html = renderToStaticMarkup(await FeeWaiverFinancePage({ searchParams: Promise.resolve({ studentId: selected.id }) }));

    expect(html).toContain('role="combobox"');
    expect(html).toContain(`name="studentId" value="${selected.id}"`);
    expect(html).toContain('value="Maryam Siddiqui"');
    expect(html).toContain('action="/admin/coupons/finance"');
  });

  it("waiver requests load one page at a time", async () => {
    const course = await createCourse();
    const students = await Promise.all(Array.from({ length: 25 }, () => createUser()));
    await prisma.couponRequest.createMany({
      data: students.map((s) => ({ userId: s.id, courseId: course.id, reason: "Financial hardship" })),
    });

    const first = await getWaiverRequestsPaginated(1, 20);
    const second = await getWaiverRequestsPaginated(2, 20);

    expect(first.totalCount).toBe(25);
    expect(first.items).toHaveLength(20);
    expect(second.items).toHaveLength(5);
    expect(first.items[0].feeTypeLabel).toEqual(expect.any(String));
  });
});
