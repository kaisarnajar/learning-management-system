import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getCourseById } from "@/lib/courses";
import { getReceiptFilename, formatInvoiceNumber } from "@/lib/payment-receipt";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { INVOICE_TERMS, AUTHORITY_SIGNATURE } from "@/lib/academy-contact";
import { getAcademySettings } from "@/lib/academy-settings";
import { renderReceiptToHtml } from "@/lib/receipt-html";
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

  const course = record.courseId ? await getCourseById(record.courseId) : null;
  const courseTitle = course?.title ?? "Darse Quran Academy";
  const filename = getReceiptFilename(courseTitle, paymentRecordId);
  
  // 1. Fetch Dynamic Configuration
  const [socialLinks, academySettings] = await Promise.all([
    getSocialLinksSettings(),
    getAcademySettings(),
  ]);
  
  // 2. Read Images and convert to Base64 to guarantee rendering inside Puppeteer
  let base64Logo = "";
  let base64Signature = "";
  try {
    const logoPath = path.join(process.cwd(), "public", "assets", "logo.png");
    const sigPath = path.join(process.cwd(), "public", "assets", "signature.png");
    
    const [logoBytes, sigBytes] = await Promise.all([
      fs.readFile(logoPath).catch(() => null),
      fs.readFile(sigPath).catch(() => null),
    ]);
    
    if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString('base64')}`;
    if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString('base64')}`;
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
      receiptId: formatInvoiceNumber(paymentRecordId),
      date: record.paidAt.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      method: record.submission?.paymentMethod || record.paymentType || "MANUAL",
      courseName: courseTitle,
      amount: record.amountInrPaise / 100,
      currency: "₹",
    },
    authority: {
      name: AUTHORITY_SIGNATURE.name,
      designation: AUTHORITY_SIGNATURE.designation,
      signatureUrl: base64Signature, // Use injected Base64
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
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set content and wait for it to be loaded
    await page.setContent(fullHtml, { waitUntil: 'load' });
    
    // Wait for the Tailwind CDN script to fetch and apply
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 5000 }).catch(() => {});

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm',
      },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
