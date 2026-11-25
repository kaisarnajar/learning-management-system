import { auth } from "@/services/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { isAdminSession } from "@/services/admin";
import { getReceiptPdf } from "@/services/documents";
import { getPaymentRecordById } from "@/services/payments";
import { pdfResponse } from "@/utils/pdf-response";
import { apiError } from "@/utils/api-response";

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
    return apiError("Unauthorized.", 401);
  }
  const limited = await enforceRateLimit(RATE_LIMITS.DOCUMENT_USER, session.user.id);
  if (limited) return limited;

  const record = await getPaymentRecordById(paymentRecordId);
  const isOwner = record !== null && session.user.id === record.userId;
  const isAdmin = isAdminSession(session);

  // Same response for "missing", "not yours" and "voided" (a voided payment
  // has no receipt; the mobile route answers the same): no existence oracle.
  if (!record || record.voidedAt || (!isOwner && !isAdmin)) {
    return apiError("Receipt not found.", 404);
  }

  if (!record.receiptGeneratedAt || !record.invoiceNumber) {
    return apiError("Receipt has not been generated yet.", 400);
  }

  try {
    // The stored file when the receipt was rendered at issue time; Chromium
    // only for records without one.
    const { pdf: pdfBuffer, filename } = await getReceiptPdf(record);

    return pdfResponse(pdfBuffer, filename, { inline: true });
  } catch (error) {
    const err = error as Error;
    console.error("PDF Generation Error:", err.stack || err);
    return apiError("Failed to generate PDF", 500);
  }
}
