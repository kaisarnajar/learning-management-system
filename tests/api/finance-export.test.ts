import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/utils/prisma";
import { GET as financeExport } from "@/app/api/v1/admin/finance/export/route";
import { createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, jsonOf, signedInAdmin } from "../helpers/api";

// The export runs the website's route through the actor bridge, as in production.
vi.unmock("@/services/auth");

// A small cap keeps the test fast; the route reads the same constant.
vi.mock("@/services/finance-filters", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/services/finance-filters")>()),
  FINANCE_EXPORT_MAX_ROWS: 2,
}));

const XLSX_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

async function manualPayments(count: number, paidAt: Date) {
  const student = await createUser();
  await prisma.paymentRecord.createMany({
    data: Array.from({ length: count }, () => ({
      userId: student.id,
      amountInrPaise: 10000,
      paidAt,
      paymentType: "manual",
      paymentTypeEnum: "MANUAL" as const,
    })),
  });
}

/** GET /api/v1/admin/finance/export (M23). */
describe.skipIf(SKIP_WITHOUT_DB)("finance export", () => {
  beforeEach(resetDb);

  it("needs a bounded date range", async () => {
    const { headers } = await signedInAdmin();

    const allTime = await financeExport(apiRequest("/api/v1/admin/finance/export?type=income&preset=all_time", { headers }));
    expect(allTime.status).toBe(400);
    expect((await jsonOf(allTime)).error).toMatch(/date range/i);

    const openEnded = await financeExport(apiRequest("/api/v1/admin/finance/export?type=income&preset=custom&from=2026-01-01", { headers }));
    expect(openEnded.status).toBe(400);

    const january = await financeExport(apiRequest("/api/v1/admin/finance/export?type=income&from=2026-01-01&to=2026-01-31", { headers }));
    expect(january.status).toBe(200);
    expect(january.headers.get("content-type")).toBe(XLSX_TYPE);
  });

  it("refuses an export over the row cap with a clear error, and serves one at the cap", async () => {
    const { headers } = await signedInAdmin();
    await manualPayments(2, new Date("2026-01-10T06:00:00Z"));
    await manualPayments(3, new Date("2026-02-10T06:00:00Z"));

    const atCap = await financeExport(apiRequest("/api/v1/admin/finance/export?type=income&from=2026-01-01&to=2026-01-31", { headers }));
    expect(atCap.status).toBe(200);

    const overCap = await financeExport(apiRequest("/api/v1/admin/finance/export?type=income&from=2026-02-01&to=2026-02-28", { headers }));
    expect(overCap.status).toBe(400);
    expect((await jsonOf(overCap)).error).toMatch(/more than 2 rows/i);
  });

  it("returns a valid workbook with one Report sheet, the header row and numeric amounts (M26)", async () => {
    const { headers } = await signedInAdmin();
    await manualPayments(1, new Date("2026-01-10T06:00:00Z"));

    const response = await financeExport(apiRequest("/api/v1/admin/finance/export?type=income&from=2026-01-01&to=2026-01-31", { headers }));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="Course_Income_\d{4}-\d{2}-\d{2}\.xlsx"$/);
    const bytes = Buffer.from(await response.arrayBuffer());
    expect(bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04])); // zip magic

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes as unknown as ArrayBuffer);
    expect(workbook.worksheets.map((w) => w.name)).toEqual(["Report"]);
    const sheet = workbook.getWorksheet("Report")!;
    expect(sheet.rowCount).toBe(2);
    expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual([
      "Date",
      "Student Name",
      "Student Email",
      "Course Title",
      "Payment Type",
      "Amount (INR)",
      "Description",
    ]);
    const row = (sheet.getRow(2).values as unknown[]).slice(1);
    expect(row[0]).toBe("10 Jan 2026");
    expect(row[3]).toBe("—");
    expect(row[5]).toBe(100);
  });
});
