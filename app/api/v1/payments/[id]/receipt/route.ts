import { NextRequest } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getReceiptPdf } from "@/services/documents";
import { getPaymentRecordById } from "@/services/payments";
import { enforceRateLimit, RATE_LIMITS } from "@/services/rate-limit";
import { apiError } from "@/utils/api-response";
import { pdfResponse } from "@/utils/pdf-response";

// Chromium cold start plus rendering can exceed the default function timeout.
export const maxDuration = 60;

/**
 * The PDF receipt of one of the caller's payments (the `id` of a payment
 * record from /api/v1/payments/history, once the academy has issued its
 * receipt). Missing and "not yours" answer the same 404.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  const limited = await enforceRateLimit(RATE_LIMITS.DOCUMENT_USER, user.id, { success: false, error: "Too many downloads. Please wait a minute." });
  if (limited) return limited;

  const { id } = await params;
  const record = await getPaymentRecordById(id);
  if (!record || record.userId !== user.id || record.voidedAt) return apiError("Receipt not found.", 404);
  if (!record.receiptGeneratedAt || !record.invoiceNumber) return apiError("The academy has not issued this receipt yet.", 409);

  try {
    const { pdf, filename } = await getReceiptPdf(record);
    return pdfResponse(pdf, filename);
  } catch (error) {
    console.error("[api/v1/payments/[id]/receipt]", error);
    return apiError("Failed to generate the receipt.", 500);
  }
}
