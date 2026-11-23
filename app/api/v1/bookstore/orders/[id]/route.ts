import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getBookOrdersForUser } from "@/services/bookstore";
import { apiError, apiServerError } from "@/utils/api-response";

/**
 * One of the caller's book orders with its items, status, courier details
 * and, once issued, the payment record whose receipt can be downloaded from
 * /api/v1/payments/{paymentRecordId}/receipt.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const order = (await getBookOrdersForUser(user.id)).find((o) => o.id === id);
    if (!order) return apiError("Order not found.", 404);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user: _owner, ...rest } = order;
    return NextResponse.json({ success: true, order: rest });
  } catch (error) {
    return apiServerError("api/v1/bookstore/orders/[id]", error, "Failed to fetch the order.");
  }
}
