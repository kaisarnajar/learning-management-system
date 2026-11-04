import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND_CONFIG } from "@/config/brand";
import { shouldShowDeveloperCredits } from "@/config/credits";
import { INVOICE_TERMS } from "@/services/academy-contact";
import { ACADEMY_LOCATION } from "@/services/academy-location";
import { renderReceiptToHtml } from "@/utils/receipt-html";
import type { ReceiptData } from "@/types/receipt";
import { GET as serviceWorker } from "@/app/sw.js/route";

afterEach(() => vi.unstubAllEnvs());

const receiptFor = (academyName: string): ReceiptData => ({
  academy: { name: academyName, address: "", phone: "", email: "", website: "", logoUrl: "" },
  student: { name: "S", address: "", phone: "" },
  payment: { receiptId: "R", date: "d", method: "UPI", courseName: "C", academicTerm: "", amount: 100, baseAmount: 100, gstAmount: 0, gstRatePercent: 0, currency: "₹", typeLabel: "" },
  authority: { name: "A", designation: "B", signatureUrl: "", stampUrl: "" },
  termsAndConditions: [],
});

describe("brand strings come from the brand config", () => {
  it("keeps the values that were previously hard-coded", () => {
    expect(INVOICE_TERMS[1]).toContain("Darse-Quran Academy reserves the right");
    expect(ACADEMY_LOCATION.name).toBe("DARSE-QURAN");
    expect(ACADEMY_LOCATION.label).toBe("DARSE-QURAN, Jammu & Kashmir");
  });

  it("puts the academy name on the receipt seal over two lines", () => {
    expect(renderReceiptToHtml(receiptFor(BRAND_CONFIG.name))).toContain("Darse Quran<br/>Academy");
  });

  it("escapes an academy name that carries markup", () => {
    expect(renderReceiptToHtml(receiptFor("<img src=x onerror=alert(1)> Academy"))).not.toContain("<img src=x");
  });

  it("serves a service worker whose cache name is unchanged", async () => {
    const response = serviceWorker();
    const body = await response.text();

    expect(response.headers.get("content-type")).toContain("application/javascript");
    expect(body).toContain(`const CACHE_NAME = "dqa-pwa-cache-v1";`);
    expect(body).toContain(`Service Worker for ${BRAND_CONFIG.name} PWA`);
  });
});

describe("developer credits", () => {
  it("are omitted unless SHOW_DEVELOPER_CREDITS is exactly 'true'", () => {
    vi.stubEnv("SHOW_DEVELOPER_CREDITS", "");
    expect(shouldShowDeveloperCredits()).toBe(false);
    vi.stubEnv("SHOW_DEVELOPER_CREDITS", "1");
    expect(shouldShowDeveloperCredits()).toBe(false);
    vi.stubEnv("SHOW_DEVELOPER_CREDITS", "true");
    expect(shouldShowDeveloperCredits()).toBe(true);
  });
});
