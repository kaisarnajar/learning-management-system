import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { isAdminSession } from "@/services/admin";
import { BRAND_CONFIG } from "@/config/brand";
import { getCourseById } from "@/services/courses";
import { prepareReceiptData } from "@/services/payment-receipt";
import { renderReceiptToHtml } from "@/utils/receipt-html";
import { generatePdfFromHtml, wrapHtmlForPdf } from "@/services/pdf-generator";
import { getPaymentRecordById } from "@/services/payments";

// Chromium cold start plus rendering can exceed the default function timeout.
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentRecordId: string }> },
) {
  const { paymentRecordId } = await params;

  // Authenticate before touching the database so unauthenticated callers
  // cannot probe which record ids exist or burn Chromium time.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const limited = await enforceRateLimit(RATE_LIMITS.DOCUMENT_USER, session.user.id);
  if (limited) return limited;

  const record = await getPaymentRecordById(paymentRecordId);
  const isOwner = record !== null && session.user.id === record.userId;
  const isAdmin = isAdminSession(session);

  // Same response for "missing" and "not yours": no existence oracle.
  if (!record || (!isOwner && !isAdmin)) {
    return NextResponse.json({ error: "Receipt not found." }, { status: 404 });
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
  const fullHtml = await wrapHtmlForPdf(componentHtml, { landscape: false });

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
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
