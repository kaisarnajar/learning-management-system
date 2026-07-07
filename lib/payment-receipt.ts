import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { getAcademySettings } from "@/lib/academy-settings";
import { INVOICE_TERMS, AUTHORITY_SIGNATURE } from "@/lib/academy-contact";
import { ReceiptData } from "@/types/receipt";
import { incomePaymentTypeLabel } from "@/lib/monthly-payment-status";
import { ASSET_LOCAL_PATHS } from "@/config/assets";


export function getReceiptFilename(courseTitle: string, paymentRecordId: string): string {
  const slug = courseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `invoice-${slug || "payment"}-${paymentRecordId.slice(0, 8)}.pdf`;
}

export type ReceiptAssets = {
  base64Logo: string;
  base64Signature: string;
  base64Stamp: string;
};

export async function loadReceiptAssets(): Promise<ReceiptAssets> {
  let base64Logo = "";
  let base64Signature = "";
  let base64Stamp = "";
  try {
    const logoPath = ASSET_LOCAL_PATHS.logo;
    const sigPath = ASSET_LOCAL_PATHS.signature;
    const stampPath = ASSET_LOCAL_PATHS.stamp;
    
    const [logoBytes, sigBytes, stampBytes] = await Promise.all([
      fs.readFile(logoPath).catch(() => null),
      fs.readFile(sigPath).catch(() => null),
      fs.readFile(stampPath).catch(() => null),
    ]);
    
    if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString("base64")}`;
    if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString("base64")}`;
    if (stampBytes) base64Stamp = `data:image/png;base64,${stampBytes.toString("base64")}`;
  } catch (e) {
    console.error("[payment-receipt] Could not load images:", e);
  }
  return { base64Logo, base64Signature, base64Stamp };
}

export type ReceiptRecordInput = {
  id: string;
  userId: string;
  amountInrPaise: number;
  paymentType: string | null;
  description: string | null;
  invoiceNumber: string | null;
  receiptGeneratedAt: Date | null;
  receiptFeeAmountPaise: number | null;
  receiptGstAmountPaise: number | null;
  user: {
    name: string | null;
    address: string | null;
    whatsapp: string | null;
  };
  submission?: {
    paymentMethod: string | null;
    upiTransactionId: string | null;
    label: string | null;
  } | null;
};

export async function prepareReceiptData(
  record: ReceiptRecordInput,
  courseTitle: string,
  options?: {
    invoiceNumberOverride?: string;
    includeGstOverride?: boolean;
    baseAmountPaiseOverride?: number;
    gstAmountPaiseOverride?: number;
  }
): Promise<{ receiptData: ReceiptData; filename: string }> {
  let finalCourseTitle = courseTitle;
  let shippingAmount = 0;
  let paymentMethod = record.submission?.paymentMethod || record.paymentType || "MANUAL";
  
  if (record.paymentType === "book_purchase") {
    finalCourseTitle = "Book Order";
    const match = record.description?.match(/Book order #([A-Z0-9]+)/i);
    if (match) {
      const shortId = match[1];
      const bookOrder = await prisma.bookOrder.findFirst({
        where: { 
          userId: record.userId,
          id: { endsWith: shortId.toLowerCase() },
          totalAmountInrPaise: record.amountInrPaise 
        }
      });
      if (bookOrder) {
        shippingAmount = bookOrder.shippingChargeInrPaise / 100;
        if (bookOrder.paymentMethod) {
          paymentMethod = bookOrder.paymentMethod;
        }
      }
    }
  }

  const filename = getReceiptFilename(finalCourseTitle, record.id);
  
  const [socialLinks, academySettings, assets] = await Promise.all([
    getSocialLinksSettings(),
    getAcademySettings(),
    loadReceiptAssets(),
  ]);

  const invoiceNumber = options?.invoiceNumberOverride || record.invoiceNumber || "";
  const dateFormatted = (record.receiptGeneratedAt || new Date()).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const baseAmount = options?.baseAmountPaiseOverride !== undefined
    ? options.baseAmountPaiseOverride
    : record.receiptFeeAmountPaise;

  const gstAmount = options?.gstAmountPaiseOverride !== undefined
    ? options.gstAmountPaiseOverride
    : record.receiptGstAmountPaise;

  const receiptData: ReceiptData = {
    academy: {
      name: academySettings.academyName,
      address: academySettings.academyAddress,
      phone: formatWhatsAppForDisplay(socialLinks.whatsappNumber) || "",
      email: socialLinks.contactEmail || "",
      website: academySettings.academyWebsite,
      logoUrl: assets.base64Logo,
    },
    student: {
      name: record.user.name || "Student",
      address: record.user.address || "N/A",
      phone: record.user.whatsapp ? formatWhatsAppForDisplay(record.user.whatsapp) : "N/A",
    },
    payment: {
      receiptId: invoiceNumber,
      date: dateFormatted,
      method: paymentMethod,
      courseName: finalCourseTitle,
      amount: record.amountInrPaise / 100,
      baseAmount: baseAmount ? baseAmount / 100 : undefined,
      gstAmount: gstAmount ? gstAmount / 100 : undefined,
      shippingAmount: shippingAmount > 0 ? shippingAmount : undefined,
      currency: "₹",
      typeLabel: record.paymentType === "book_purchase" ? "Books" : incomePaymentTypeLabel(record.paymentType),
    },
    authority: {
      name: AUTHORITY_SIGNATURE.name,
      designation: AUTHORITY_SIGNATURE.designation,
      signatureUrl: assets.base64Signature,
      stampUrl: assets.base64Stamp,
    },
    termsAndConditions: [...INVOICE_TERMS],
  };

  return { receiptData, filename };
}
