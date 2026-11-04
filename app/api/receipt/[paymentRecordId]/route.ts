import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { isAdminSession } from "@/services/admin";
import { getReceiptPdf } from "@/services/documents";
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

  try {
    // The stored file when the receipt was rendered at issue time; Chromium
    // only for records without one.
    const { pdf: pdfBuffer, filename } = await getReceiptPdf(record);

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
