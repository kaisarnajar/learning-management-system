import { beforeEach, describe, expect, it } from "vitest";
import { GET as listReceipts } from "@/app/api/v1/admin/receipts/route";
import { issueApiSession } from "@/services/api-auth";
import { prisma } from "@/utils/prisma";
import { createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, bearer, jsonOf } from "../helpers/api";

describe.skipIf(SKIP_WITHOUT_DB)("GET /api/v1/admin/receipts", () => {
  beforeEach(resetDb);

  it("returns the requested page, not always the first", async () => {
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    const { accessToken } = await issueApiSession({ id: admin.id, email: admin.email, role: "ADMIN" });
    const student = await createUser();
    await prisma.paymentRecord.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        userId: student.id,
        amountInrPaise: 10000,
        paidAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
        invoiceNumber: `DQA-INV/2026-01/${String(i + 1).padStart(5, "0")}`,
        receiptGeneratedAt: new Date(Date.UTC(2026, 0, 1, 0, i)),
      })),
    });

    const response = await listReceipts(apiRequest("/api/v1/admin/receipts?page=2&pageSize=20", { headers: bearer(accessToken) }));
    const body = await jsonOf(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ totalCount: 25, page: 2, pageSize: 20 });
    expect(body.data).toHaveLength(5);
    expect(body.data[0].invoiceNumber).toBe("DQA-INV/2026-01/00005");
  });
});
