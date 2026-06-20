import puppeteer from "puppeteer";
import { ACADEMY_INVOICE, INVOICE_TERMS } from "@/lib/academy-contact";
import { readFile } from "fs/promises";
import path from "path";

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

export function formatInvoiceNumber(paymentRecordId: string): string {
  let hash = 0;
  for (let i = 0; i < paymentRecordId.length; i++) {
    hash = Math.imul(31, hash) + paymentRecordId.charCodeAt(i);
    hash |= 0;
  }
  const num = (Math.abs(hash) % 99800) + 201;
  return `INV${String(num).padStart(5, "0")}`;
}

function formatPriceForHtml(paise: number): string {
  const inr = paise / 100;
  return `Rs. ${inr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPriceShort(paise: number): string {
  const inr = paise / 100;
  if (Number.isInteger(inr)) {
    return `Rs. ${inr.toLocaleString("en-IN")}`;
  }
  return formatPriceForHtml(paise);
}

function formatInvoiceDate(date: Date): string {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function buildPaymentNote(data: PaymentReceiptData): string {
  const amount = formatPriceShort(data.amountInrPaise);
  const method = data.paymentMethod?.toUpperCase() ?? "PAYMENT";
  const detail = data.paymentNote?.trim() || data.lineDescription;
  let note = `Paid ${amount}`;
  if (detail) note += ` - ${detail}`;
  note += ` Via ${method}`;
  if (data.upiTransactionId) note += ` (Ref: ${data.upiTransactionId})`;
  return note.slice(0, 140);
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


