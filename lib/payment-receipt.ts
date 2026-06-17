import { readFile } from "fs/promises";
import path from "path";
import {
  PDFDocument,
  type PDFImage,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";
import { ACADEMY_INVOICE, INVOICE_TERMS } from "@/lib/academy-contact";

export type PaymentReceiptData = {
  invoiceNumber: string;
  studentName: string;
  studentAddress: string | null;
  studentPhone: string | null;
  studentEmail: string | null;
  courseTitle: string;
  lineDescription: string;
  quantity: number;
  unitPricePaise: number;
  discountPercent: number;
  amountInrPaise: number;
  paidAt: Date;
  paymentMethod: string | null;
  paymentNote: string | null;
  upiTransactionId: string | null;
};

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 44;
const CONTENT_W = PAGE_W - MARGIN * 2;

const INK = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.35, 0.34, 0.32);
const BORDER = rgb(0.75, 0.73, 0.7);
const HEADER_BG = rgb(0.94, 0.93, 0.91);
const PAID_GREEN = rgb(0.15, 0.52, 0.32);
const PAID_BG = rgb(0.88, 0.96, 0.9);

export function formatInvoiceNumber(paymentRecordId: string): string {
  let hash = 0;
  for (let i = 0; i < paymentRecordId.length; i++) {
    hash = Math.imul(31, hash) + paymentRecordId.charCodeAt(i);
    hash |= 0;
  }
  const num = (Math.abs(hash) % 99800) + 201;
  return `INV${String(num).padStart(5, "0")}`;
}

function formatPriceForPdf(paise: number): string {
  const inr = paise / 100;
  return `Rs. ${inr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPriceShort(paise: number): string {
  const inr = paise / 100;
  if (Number.isInteger(inr)) {
    return `Rs. ${inr.toLocaleString("en-IN")}`;
  }
  return formatPriceForPdf(paise);
}

function sanitizePdfText(text: string): string {
  return text
    .replace(/\u20b9/g, "Rs.")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/[^\t\n\r\x20-\x7e\xa0-\xff]/g, "");
}

function formatInvoiceDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function wrapTextByWidth(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitizePdfText(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : ["-"];
}

function drawRightText(
  page: PDFPage,
  text: string,
  rightX: number,
  y: number,
  size: number,
  font: PDFFont,
  color = INK,
) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - w, y, size, font, color });
}

function drawHLine(page: PDFPage, y: number, x1 = MARGIN, x2 = PAGE_W - MARGIN) {
  page.drawLine({
    start: { x: x1, y },
    end: { x: x2, y },
    thickness: 0.75,
    color: BORDER,
  });
}

async function embedLogo(pdf: PDFDocument): Promise<PDFImage | null> {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    const bytes = await readFile(logoPath);
    return pdf.embedPng(bytes);
  } catch (error) {
    console.error("Caught error:", error);
    return null;
    }
}

function buildPaymentNote(data: PaymentReceiptData): string {
  const amount = formatPriceShort(data.amountInrPaise);
  const method = data.paymentMethod?.toUpperCase() ?? "PAYMENT";
  const detail = data.paymentNote?.trim() || data.lineDescription;
  let note = `Paid ${amount}`;
  if (detail) note += ` - ${detail}`;
  note += ` Via ${method}`;
  if (data.upiTransactionId) note += ` (Ref: ${data.upiTransactionId})`;
  return sanitizePdfText(note).slice(0, 140);
}

export async function generatePaymentReceiptPdf(data: PaymentReceiptData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await embedLogo(pdf);

  let y = PAGE_H - MARGIN;

  if (logo) {
    const logoH = 48;
    const logoW = (logo.width / logo.height) * logoH;
    page.drawImage(logo, {
      x: MARGIN,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
  }

  const invoiceTitle = "INVOICE";
  const titleSize = 26;
  drawRightText(page, invoiceTitle, PAGE_W - MARGIN, y - 8, titleSize, fontBold, INK);

  y -= 58;

  const colMid = PAGE_W / 2 + 8;
  const academyLines = [
    ACADEMY_INVOICE.name,
    ACADEMY_INVOICE.addressLine1,
    ACADEMY_INVOICE.addressLine2,
    ACADEMY_INVOICE.phone,
    ACADEMY_INVOICE.email,
    ACADEMY_INVOICE.website,
  ];

  for (const line of academyLines) {
    const size = line === ACADEMY_INVOICE.name ? 11 : 9;
    const f = line === ACADEMY_INVOICE.name ? fontBold : font;
    page.drawText(sanitizePdfText(line), {
      x: MARGIN,
      y,
      size,
      font: f,
      color: line === ACADEMY_INVOICE.name ? INK : MUTED,
    });
    y -= line === ACADEMY_INVOICE.name ? 16 : 13;
  }

  let metaY = PAGE_H - MARGIN - 58;
  page.drawText(sanitizePdfText(`INVOICE # ${data.invoiceNumber}`), {
    x: colMid,
    y: metaY,
    size: 10,
    font: fontBold,
    color: INK,
  });
  metaY -= 18;
  page.drawText(sanitizePdfText(`DATE ${formatInvoiceDate(data.paidAt)}`), {
    x: colMid,
    y: metaY,
    size: 10,
    font,
    color: INK,
  });

  y -= 20;
  drawHLine(page, y);
  y -= 22;

  page.drawText("BILL TO", {
    x: MARGIN,
    y,
    size: 9,
    font: fontBold,
    color: MUTED,
  });
  y -= 16;

  const billLines = [
    data.studentName || "Student",
    data.studentAddress,
    data.studentPhone,
    data.studentEmail,
  ].filter((line): line is string => Boolean(line?.trim()));

  for (const line of billLines) {
    for (const wrapped of wrapTextByWidth(line, font, 10, CONTENT_W * 0.55)) {
      page.drawText(wrapped, { x: MARGIN, y, size: 10, font, color: INK });
      y -= 14;
    }
  }

  y -= 12;
  drawHLine(page, y);
  y -= 4;

  const tableTop = y;
  const colDesc = MARGIN;
  const colQty = MARGIN + 268;
  const colPrice = MARGIN + 310;
  const colDisc = MARGIN + 378;
  const colAmt = PAGE_W - MARGIN;
  const headerH = 22;

  page.drawRectangle({
    x: MARGIN,
    y: tableTop - headerH,
    width: CONTENT_W,
    height: headerH,
    color: HEADER_BG,
    borderColor: BORDER,
    borderWidth: 0.75,
  });

  const headerY = tableTop - 15;
  page.drawText("Description", { x: colDesc + 6, y: headerY, size: 8, font: fontBold, color: MUTED });
  page.drawText("QTY", { x: colQty, y: headerY, size: 8, font: fontBold, color: MUTED });
  page.drawText("Price", { x: colPrice, y: headerY, size: 8, font: fontBold, color: MUTED });
  page.drawText("Discount", { x: colDisc, y: headerY, size: 8, font: fontBold, color: MUTED });
  drawRightText(page, "Amount", colAmt - 6, headerY, 8, fontBold, MUTED);

  y = tableTop - headerH;

  const descWidth = colQty - colDesc - 12;
  const titleLines = wrapTextByWidth(data.courseTitle, fontBold, 10, descWidth);
  const detailLines = wrapTextByWidth(data.lineDescription, font, 9, descWidth);
  const rowLineCount = Math.max(titleLines.length + detailLines.length, 1);
  const rowH = Math.max(36, 14 + rowLineCount * 13);

  page.drawRectangle({
    x: MARGIN,
    y: y - rowH,
    width: CONTENT_W,
    height: rowH,
    borderColor: BORDER,
    borderWidth: 0.75,
  });

  let rowY = y - 16;
  for (const line of titleLines) {
    page.drawText(line, { x: colDesc + 6, y: rowY, size: 10, font: fontBold, color: INK });
    rowY -= 13;
  }
  for (const line of detailLines) {
    page.drawText(line, { x: colDesc + 6, y: rowY, size: 9, font, color: MUTED });
    rowY -= 12;
  }

  const qty = String(data.quantity);
  const priceStr = formatPriceForPdf(data.unitPricePaise);
  const discStr = data.discountPercent > 0 ? `${data.discountPercent}%` : "-";
  const amtStr = formatPriceForPdf(data.amountInrPaise);
  const rowMidY = y - rowH / 2 - 4;

  page.drawText(qty, { x: colQty, y: rowMidY, size: 10, font, color: INK });
  page.drawText(priceStr, { x: colPrice, y: rowMidY, size: 9, font, color: INK });
  page.drawText(discStr, { x: colDisc, y: rowMidY, size: 9, font, color: INK });
  drawRightText(page, amtStr, colAmt - 6, rowMidY, 10, fontBold, INK);

  y -= rowH + 20;

  page.drawText("Payment Method", {
    x: MARGIN,
    y,
    size: 9,
    font: fontBold,
    color: MUTED,
  });
  y -= 16;

  const note = buildPaymentNote(data);
  for (const line of wrapTextByWidth(note, font, 9, CONTENT_W - 120)) {
    page.drawText(line, { x: MARGIN, y, size: 9, font, color: INK });
    y -= 13;
  }

  y -= 8;
  drawHLine(page, y, MARGIN + 280, PAGE_W - MARGIN);
  y -= 18;

  page.drawText("TOTAL", {
    x: MARGIN + 300,
    y,
    size: 11,
    font: fontBold,
    color: INK,
  });
  drawRightText(page, formatPriceForPdf(data.amountInrPaise), colAmt - 6, y, 12, fontBold, INK);

  y -= 28;
  page.drawText("Terms & Conditions", {
    x: MARGIN,
    y,
    size: 9,
    font: fontBold,
    color: MUTED,
  });
  y -= 14;

  for (let i = 0; i < INVOICE_TERMS.length; i++) {
    const term = `${i + 1}. ${INVOICE_TERMS[i]}`;
    for (const line of wrapTextByWidth(term, font, 8, CONTENT_W - 100)) {
      page.drawText(line, { x: MARGIN, y, size: 8, font, color: MUTED });
      y -= 11;
    }
    y -= 4;
  }

  const stampW = 88;
  const stampH = 36;
  const stampX = PAGE_W - MARGIN - stampW;
  const stampY = MARGIN + 12;

  page.drawRectangle({
    x: stampX,
    y: stampY,
    width: stampW,
    height: stampH,
    color: PAID_BG,
    borderColor: PAID_GREEN,
    borderWidth: 2,
  });
  const paidLabel = "PAID";
  const paidSize = 18;
  const paidW = fontBold.widthOfTextAtSize(paidLabel, paidSize);
  page.drawText(paidLabel, {
    x: stampX + (stampW - paidW) / 2,
    y: stampY + 10,
    size: paidSize,
    font: fontBold,
    color: PAID_GREEN,
  });

  return pdf.save();
}

export function buildReceiptLineDescription(
  courseTitle: string,
  paymentDescription: string | null,
  courseDescription?: string | null,
): string {
  const parts = [paymentDescription, courseDescription]
    .map((p) => p?.trim())
    .filter(Boolean) as string[];
  if (parts.length === 0) return courseTitle;
  return parts.join(" - ");
}

export function getReceiptFilename(courseTitle: string, paymentRecordId: string): string {
  const slug = courseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
  return `invoice-${slug || "payment"}-${paymentRecordId.slice(0, 8)}.pdf`;
}
