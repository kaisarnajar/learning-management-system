import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { deleteReceipt, generateReceipt } from "@/app/actions/receipts";
import { ADMIN_ROLES, staffAction, staffRead } from "@/services/api-staff";
import { getCourseById } from "@/services/courses";
import { incomePaymentTypeLabel } from "@/services/monthly-payment-status";
import { getPaymentRecordById } from "@/services/payments";
import { apiError } from "@/utils/api-response";

type Params = { params: Promise<{ id: string }> };

/** One payment record's receipt state, as on /admin/receipts/[paymentRecordId] (the PDF: ./pdf). */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/receipts/[id]", async () => {
    const record = await getPaymentRecordById(id);
    if (!record) notFound();
    const course = record.courseId ? await getCourseById(record.courseId) : null;
    return {
      receipt: {
        id: record.id,
        invoiceNumber: record.invoiceNumber,
        receiptGeneratedAt: record.receiptGeneratedAt,
        receiptEmailSentAt: record.receiptEmailSentAt,
        receiptIncludesGst: Boolean(record.receiptIncludesGst),
        receiptFeeAmountPaise: record.receiptFeeAmountPaise,
        receiptGstAmountPaise: record.receiptGstAmountPaise,
        receiptShippingAmountPaise: record.receiptShippingAmountPaise,
        amountInrPaise: record.amountInrPaise,
        paidAt: record.paidAt,
        paymentType: record.paymentType,
        paymentTypeLabel: incomePaymentTypeLabel(record.paymentType),
        description: record.description ?? record.submission?.label ?? null,
        paymentMethod: record.submission?.paymentMethod ?? null,
        reference: record.submission?.upiTransactionId ?? null,
        voided: Boolean(record.voidedAt),
        courseTitle: course?.title ?? null,
        user: { id: record.user.id, name: record.user.name, email: record.user.email },
      },
    };
  });
}

/** The messages generateReceipt throws on purpose; anything else is a 500. */
const RECEIPT_ERRORS = ["Receipt has already been generated.", "Payment record not found.", "Unauthorized: Only admins can generate receipts."];

/** Generates the receipt (allocates the invoice number and stores the PDF). */
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/receipts/[id] POST", async () => {
    try {
      return await generateReceipt(id);
    } catch (error) {
      if (error instanceof Error && RECEIPT_ERRORS.includes(error.message)) return apiError(error.message, 400);
      throw error;
    }
  });
}

/** Deletes the generated receipt; the payment record stays and a new receipt can be generated. */
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/receipts/[id] DELETE", () => deleteReceipt(id));
}
