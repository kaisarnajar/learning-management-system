import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getCourseById } from "@/lib/courses";
import { getReceiptFilename } from "@/lib/payment-receipt";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { INVOICE_TERMS, AUTHORITY_SIGNATURE } from "@/lib/academy-contact";
import { getAcademySettings } from "@/lib/academy-settings";
import { renderReceiptToHtml } from "@/lib/receipt-html";
import { generatePdfFromHtml } from "@/lib/pdf-generator";
import { ReceiptData } from "@/types/receipt";
import fs from "fs/promises";
import path from "path";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentRecordId: string }> },
) {
  const { paymentRecordId } = await params;

  const record = await withDbErrorHandling(() => prisma.paymentRecord.findUnique({
      where: { id: paymentRecordId },
      include: {
        user: {
          select: { id: true, name: true, email: true, address: true, whatsapp: true },
        },
        submission: {
          select: { paymentMethod: true, upiTransactionId: true, label: true },
        },
      },
    }), "Database operation failed");

  if (!record) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
  }

  const session = await auth();
  const isOwner = session?.user?.id === record.userId;
  const isAdmin = isAdminSession(session);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!record.receiptGeneratedAt || !record.invoiceNumber) {
    return NextResponse.json({ error: "Receipt has not been generated yet." }, { status: 400 });
  }

  const course = record.courseId ? await getCourseById(record.courseId) : null;
  let finalCourseTitle = course?.title ?? "Darse Quran Academy";

  let shippingAmount = 0;
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
      }
    }
  }

  const filename = getReceiptFilename(finalCourseTitle, paymentRecordId);
  
  // 1. Fetch Dynamic Configuration
  const [socialLinks, academySettings] = await Promise.all([
    getSocialLinksSettings(),
    getAcademySettings(),
  ]);
  
  // 2. Read Images and convert to Base64 to guarantee rendering inside Puppeteer
  let base64Logo = "";
  let base64Signature = "";
  let base64Stamp = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "logo.png");
    const sigPath = path.join(process.cwd(), "public", "assets", "signature.png");
    const stampPath = path.join(process.cwd(), "public", "assets", "stamp.png");
    
    const [logoBytes, sigBytes, stampBytes] = await Promise.all([
      fs.readFile(logoPath).catch(() => null),
      fs.readFile(sigPath).catch(() => null),
      fs.readFile(stampPath).catch(() => null),
    ]);
    
    if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString('base64')}`;
    if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString('base64')}`;
    if (stampBytes) base64Stamp = `data:image/png;base64,${stampBytes.toString('base64')}`;
  } catch (e) {
    console.error("Could not load images:", e);
  }

  // 3. Assemble Data Layer (No Mock Data)
  const data: ReceiptData = {
    academy: {
      name: academySettings.academyName,
      address: academySettings.academyAddress,
      phone: formatWhatsAppForDisplay(socialLinks.whatsappNumber) || "",
      email: socialLinks.contactEmail || "",
      website: academySettings.academyWebsite,
      logoUrl: base64Logo, // Use injected Base64 to fix Puppeteer rendering
    },
    student: {
      name: record.user.name || "Student",
      address: record.user.address || "N/A",
      phone: record.user.whatsapp ? formatWhatsAppForDisplay(record.user.whatsapp) : "N/A",
    },
    payment: {
      receiptId: record.invoiceNumber,
      date: record.receiptGeneratedAt.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      method: record.submission?.paymentMethod || record.paymentType || "MANUAL",
      courseName: finalCourseTitle,
      amount: record.amountInrPaise / 100,
      baseAmount: record.receiptFeeAmountPaise ? record.receiptFeeAmountPaise / 100 : undefined,
      gstAmount: record.receiptGstAmountPaise ? record.receiptGstAmountPaise / 100 : undefined,
      shippingAmount: shippingAmount > 0 ? shippingAmount : undefined,
      currency: "₹",
    },
    authority: {
      name: AUTHORITY_SIGNATURE.name,
      designation: AUTHORITY_SIGNATURE.designation,
      signatureUrl: base64Signature, // Use injected Base64
      stampUrl: base64Stamp,
    },
    termsAndConditions: [...INVOICE_TERMS],
  };

  // 4. Generate HTML String using the robust string template generator
  const componentHtml = renderReceiptToHtml(data);

  // 5. Wrap in isolated HTML document with Tailwind CDN
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        body { 
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: white !important;
          margin: 0;
        }
        /* Ensure SVGs inside base64 img tags or anywhere scale properly */
        img { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>
      <div class="p-8 flex justify-center min-h-screen">
        ${componentHtml}
      </div>
    </body>
    </html>
  `;

  try {
    const pdfBuffer = await generatePdfFromHtml(fullHtml, { format: "A4", landscape: false });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error: any) {
    console.error("PDF Generation Error:", error?.stack || error);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
