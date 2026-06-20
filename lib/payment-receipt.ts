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

function getInvoiceHtml(data: PaymentReceiptData, base64Logo: string | null): string {
    const studentLines = [
      data.studentName || "Student",
      data.studentAddress,
      data.studentPhone,
      data.studentEmail,
    ].filter(Boolean);

    const logoHtml = base64Logo 
        ? `<img src="${base64Logo}" alt="Logo" class="logo" />` 
        : `<div class="logo"></div>`;

    const discStr = data.discountPercent > 0 ? `${data.discountPercent}%` : "-";

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #1e1e24;
                margin: 0;
                padding: 44px;
                box-sizing: border-box;
                font-size: 11px;
            }
            .muted { color: #595752; }
            .bold { font-weight: bold; }
            .right { text-align: right; }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 58px;
            }
            .logo { height: 48px; width: auto; }
            .invoice-title { font-size: 26px; font-weight: bold; color: #1e1e24; }
            .top-section {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
            }
            .academy-info { font-size: 9px; line-height: 1.4; color: #595752; }
            .academy-name { font-size: 11px; font-weight: bold; color: #1e1e24; margin-bottom: 4px; }
            .meta-info { text-align: right; font-size: 10px; }
            .meta-info > div { margin-bottom: 4px; }
            .divider { border-bottom: 1px solid #bfbaba; margin: 20px 0; }
            .bill-to-title { font-size: 9px; font-weight: bold; color: #595752; margin-bottom: 10px; }
            .bill-to { font-size: 10px; line-height: 1.4; color: #1e1e24; margin-bottom: 12px; }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            th {
                background-color: #f0ede8;
                border: 1px solid #bfbaba;
                font-size: 8px;
                font-weight: bold;
                color: #595752;
                padding: 6px;
                text-align: left;
            }
            th.right { text-align: right; }
            td {
                border: 1px solid #bfbaba;
                padding: 10px 6px;
                vertical-align: top;
            }
            .item-title { font-size: 10px; font-weight: bold; margin-bottom: 4px; }
            .item-desc { font-size: 9px; color: #595752; }
            .payment-method-title { font-size: 9px; font-weight: bold; color: #595752; margin-bottom: 10px; }
            .payment-method-note { font-size: 9px; margin-bottom: 20px; line-height: 1.4; }
            .total-section {
                display: flex;
                justify-content: flex-end;
                align-items: center;
                gap: 40px;
                margin-bottom: 28px;
            }
            .total-label { font-size: 11px; font-weight: bold; }
            .total-amount { font-size: 12px; font-weight: bold; }
            .terms-title { font-size: 9px; font-weight: bold; color: #595752; margin-bottom: 10px; }
            .terms { font-size: 8px; color: #595752; line-height: 1.4; }
            .paid-stamp {
                position: absolute;
                top: 56px;
                right: 44px;
                border: 2px solid #268552;
                background-color: #e0f5e6;
                color: #268552;
                font-size: 18px;
                font-weight: bold;
                padding: 8px 20px;
                letter-spacing: 1px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            ${logoHtml}
            <div class="invoice-title">INVOICE</div>
        </div>

        <div class="paid-stamp">PAID</div>

        <div class="top-section">
            <div class="academy-info">
                <div class="academy-name">${ACADEMY_INVOICE.name}</div>
                <div>${ACADEMY_INVOICE.addressLine1}</div>
                <div>${ACADEMY_INVOICE.addressLine2}</div>
                <div>${ACADEMY_INVOICE.phone}</div>
                <div>${ACADEMY_INVOICE.email}</div>
                <div>${ACADEMY_INVOICE.website}</div>
            </div>
            <div class="meta-info">
                <div class="bold">INVOICE # ${data.invoiceNumber}</div>
                <div>DATE ${formatInvoiceDate(data.paidAt)}</div>
            </div>
        </div>

        <div class="divider"></div>

        <div class="bill-to-title">BILL TO</div>
        <div class="bill-to">
            ${studentLines.map(l => `<div>${l}</div>`).join("")}
        </div>

        <div class="divider"></div>

        <table>
            <thead>
                <tr>
                    <th>Description</th>
                    <th>QTY</th>
                    <th>Price</th>
                    <th>Discount</th>
                    <th class="right">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>
                        <div class="item-title">${data.courseTitle}</div>
                        <div class="item-desc">${data.lineDescription}</div>
                    </td>
                    <td>${data.quantity}</td>
                    <td>${formatPriceForHtml(data.unitPricePaise)}</td>
                    <td>${discStr}</td>
                    <td class="right bold">${formatPriceForHtml(data.amountInrPaise)}</td>
                </tr>
            </tbody>
        </table>

        <div class="payment-method-title">Payment Method</div>
        <div class="payment-method-note">${buildPaymentNote(data)}</div>

        <div class="divider" style="margin-left: 280px;"></div>

        <div class="total-section">
            <div class="total-label">TOTAL</div>
            <div class="total-amount">${formatPriceForHtml(data.amountInrPaise)}</div>
        </div>

        <div class="terms-title">Terms & Conditions</div>
        <div class="terms">
            ${INVOICE_TERMS.map((t, i) => `<div>${i + 1}. ${t}</div>`).join("")}
        </div>
    </body>
    </html>
    `;
}

export async function generatePaymentReceiptPdf(data: PaymentReceiptData): Promise<Uint8Array> {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        let base64Logo = null;
        try {
          const logoPath = path.join(process.cwd(), "public", "logo.png");
          const bytes = await readFile(logoPath);
          base64Logo = `data:image/png;base64,${bytes.toString('base64')}`;
        } catch (e) {
          console.error("Could not load logo:", e);
        }

        const htmlContent = getInvoiceHtml(data, base64Logo);
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' }
        });

        return new Uint8Array(pdfBuffer);
    } catch (error) {
        console.error("Failed to generate invoice PDF via Puppeteer:", error);
        throw error;
    } finally {
        await browser.close();
    }
}
