import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { getReceiptPdf } from "@/services/documents";
import { getPaymentRecordById } from "@/services/payments";
import { apiError } from "@/utils/api-response";
import { pdfResponse } from "@/utils/pdf-response";

// Chromium cold start plus rendering can exceed the default function timeout.
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/** The receipt PDF (the stored file, rendered only when none is stored). A voided payment has no receipt. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/receipts/[id]/pdf", async () => {
    const record = await getPaymentRecordById(id);
    if (!record || record.voidedAt) notFound();
    if (!record.receiptGeneratedAt || !record.invoiceNumber) return apiError("Receipt has not been generated yet.", 409);
    const { pdf, filename } = await getReceiptPdf(record);
    return pdfResponse(pdf, filename, { inline: true });
  });
}
