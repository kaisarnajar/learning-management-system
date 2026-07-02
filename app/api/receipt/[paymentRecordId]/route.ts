import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminSession } from "@/lib/admin";
import { getCourseById } from "@/lib/courses";
import { prepareReceiptData } from "@/lib/payment-receipt";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";
import { renderReceiptToHtml } from "@/lib/receipt-html";
import { generatePdfFromHtml } from "@/lib/pdf-generator";

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
  const courseTitle = course?.title ?? "Darse Quran Academy";

  const { receiptData, filename } = await prepareReceiptData(record, courseTitle);

  // 4. Generate HTML String using the robust string template generator
  const componentHtml = renderReceiptToHtml(receiptData);

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
  } catch (error) {
    const err = error as Error;
    console.error("PDF Generation Error:", err.stack || err);
    return NextResponse.json(
      { error: "Failed to generate PDF", details: err.message || String(error) },
      { status: 500 },
    );
  }
}
