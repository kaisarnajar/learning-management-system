import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { BRAND_CONFIG } from "@/config/brand";
import { getCourseById } from "@/services/courses";
import { prepareReceiptData } from "@/services/payment-receipt";
import { renderReceiptToHtml } from "@/utils/receipt-html";
import { generatePdfFromHtml, wrapHtmlForPdf } from "@/services/pdf-generator";
import { getPaymentRecordById } from "@/services/payments";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentRecordId: string }> },
) {
  const { paymentRecordId } = await params;

  const record = await getPaymentRecordById(paymentRecordId);

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
  const courseTitle = course?.title ?? BRAND_CONFIG.name;

  const { receiptData, filename } = await prepareReceiptData(record, courseTitle);

  // 4. Generate HTML String using the robust string template generator
  const componentHtml = renderReceiptToHtml(receiptData);

  // 5. Wrap in isolated HTML document with Tailwind CDN
  const fullHtml = wrapHtmlForPdf(componentHtml, { landscape: false });

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
