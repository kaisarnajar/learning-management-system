import { NextRequest } from "next/server";
import { recordStudentPayment } from "@/app/admin/record-payment/actions";
import { ADMIN_ROLES, readActionForm, staffAction } from "@/services/api-staff";

/**
 * Records a payment received outside the app (/admin/transactions → Record
 * Payment). Fields: email, amountInr, paidAt (YYYY-MM-DD), paymentType,
 * courseId (optional).
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/transactions/payments", async () =>
    recordStudentPayment({}, await readActionForm(request)),
  );
}
