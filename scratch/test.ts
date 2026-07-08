import fs from "fs";
import { renderReceiptToHtml } from "../utils/receipt-html.ts";
import { wrapHtmlForPdf, generatePdfFromHtml } from "../services/pdf-generator.ts";

const mockReceiptData = {
  academy: {
    name: "Darse Quran Academy",
    address: "Treran Tangmarg",
    phone: "+91 123",
    email: "test@example.com",
    website: "example.com",
    logoUrl: "https://example.com/logo.png"
  },
  student: {
    name: "Test Student",
    address: "Test Address",
    phone: "123"
  },
  payment: {
    receiptId: "REC-123",
    date: "7 July 2026",
    method: "upi",
    courseName: "Test Course",
    amount: 100,
    currency: "₹"
  },
  authority: {
    name: "Admin",
    designation: "Admin",
    stampUrl: "",
    signatureUrl: ""
  },
  termsAndConditions: ["Test term"]
};

async function run() {
  const html = renderReceiptToHtml(mockReceiptData as any);
  const fullHtml = wrapHtmlForPdf(html, { landscape: false });
  fs.writeFileSync("receipt.html", fullHtml);
  console.log("Created receipt.html");
}

run().catch(console.error);
