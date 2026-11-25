import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/services/social-links", () => ({
  getSocialLinksSettings: vi.fn(async () => ({ whatsappNumber: "", contactEmail: "" })),
  formatWhatsAppForDisplay: vi.fn(() => ""),
}));
vi.mock("@/services/academy-settings", () => ({
  getAcademySettings: vi.fn(async () => ({ academyName: "Academy", academyAddress: "", academyWebsite: "" })),
}));
vi.mock("@/services/pdf-generator", () => ({
  loadStandardPdfAssets: vi.fn(async () => ({ base64Logo: "", base64Signature: "", base64Stamp: "", base64Font: "" })),
}));

import { formatBusinessDisplayDate } from "@/services/business-time";
import { financialYearLabel } from "@/services/document-numbers";
import { prepareReceiptData } from "@/services/payment-receipt";

// 02:00 IST on 1 April 2026 is still 31 March in UTC (Vercel's server zone).
const EARLY_FIRST_OF_APRIL = new Date("2026-03-31T20:30:00.000Z");

describe("document dates follow the academy's time zone", () => {
  const originalTz = process.env.TZ;

  beforeAll(() => {
    // Run as the production server does; this machine may already be in IST.
    process.env.TZ = "UTC";
  });

  afterAll(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  it("formats an early-morning IST instant as that IST calendar day", () => {
    expect(formatBusinessDisplayDate(EARLY_FIRST_OF_APRIL)).toBe("1 April 2026");
    expect(formatBusinessDisplayDate(EARLY_FIRST_OF_APRIL, { day: "numeric", month: "short", year: "numeric" })).toBe(
      "1 Apr 2026",
    );
  });

  it("dates a receipt issued at 02:00 IST on 1 April in the financial year of its number", async () => {
    expect(financialYearLabel(EARLY_FIRST_OF_APRIL)).toBe("2026-27");

    const { receiptData } = await prepareReceiptData(
      {
        id: "rec_1",
        userId: "user_1",
        courseId: null,
        amountInrPaise: 49_900,
        paymentType: "MONTHLY",
        description: null,
        invoiceNumber: "DQA-INV/2026-27/00001",
        receiptGeneratedAt: EARLY_FIRST_OF_APRIL,
        receiptFeeAmountPaise: null,
        receiptGstAmountPaise: null,
        user: { name: "Student", address: null, whatsapp: null },
        submission: null,
      },
      "Course",
    );

    expect(receiptData.payment.receiptId).toContain("/2026-27/");
    expect(receiptData.payment.date).toBe("1 April 2026");
  });
});
