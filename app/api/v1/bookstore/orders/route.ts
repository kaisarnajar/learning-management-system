import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth, requireVerifiedEmail } from "@/services/api-auth";
import { getBookOrdersForUser } from "@/services/bookstore";
import { validatePendingUpload } from "@/services/uploads";
import { apiError, apiServerError, INVALID_JSON_MESSAGE, readJson } from "@/utils/api-response";
import { bookstoreCheckoutSchema } from "@/utils/validations";
import { createBookOrder } from "@/services/book-orders";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const orders = await getBookOrdersForUser(user.id);
    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error) {
    return apiServerError("api/v1/bookstore/orders", error, "Failed to fetch bookstore orders.");
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;
  const unverified = requireVerifiedEmail(user, "place a book order");
  if (unverified) return unverified;

  try {
    let rawItems: string | null = null;
    let paymentMethod: string | null = null;
    let upiTransactionId: string | null = null;
    let deliveryAddress: string | null = null;
    let deliveryPinCode: string | null = null;
    let deliveryPhoneNumber: string | null = null;
    let notes: string | null = null;
    let expectedTotalPaise: unknown;
    let screenshotFile: File | null = null;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      rawItems = formData.get("items") as string;
      paymentMethod = formData.get("paymentMethod") as string;
      upiTransactionId = formData.get("upiTransactionId") as string;
      deliveryAddress = formData.get("deliveryAddress") as string;
      deliveryPinCode = formData.get("deliveryPinCode") as string;
      deliveryPhoneNumber = formData.get("deliveryPhoneNumber") as string;
      notes = formData.get("notes") as string | null;
      expectedTotalPaise = formData.get("expectedTotalPaise");
      screenshotFile = formData.get("screenshot") as File | null;
    } else {
      const bodyJson = await readJson(request);
      if (!bodyJson) return apiError(INVALID_JSON_MESSAGE, 400);
      // Passed on as sent; bookstoreCheckoutSchema checks the types.
      rawItems = typeof bodyJson.items === "string" ? bodyJson.items : (JSON.stringify(bodyJson.items) ?? null);
      paymentMethod = bodyJson.paymentMethod as string | null;
      upiTransactionId = bodyJson.upiTransactionId as string | null;
      deliveryAddress = bodyJson.deliveryAddress as string | null;
      deliveryPinCode = bodyJson.deliveryPinCode as string | null;
      deliveryPhoneNumber = bodyJson.deliveryPhoneNumber as string | null;
      notes = (bodyJson.notes as string | null) || null;
      expectedTotalPaise = bodyJson.expectedTotalPaise;
    }

    if (!rawItems) {
      return apiError("No items provided.", 400);
    }

    let parsedItems;
    try {
      parsedItems = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
    } catch {
      return apiError("Invalid items format.", 400);
    }

    const validation = bookstoreCheckoutSchema.safeParse({
      items: parsedItems,
      paymentMethod,
      upiTransactionId,
      deliveryAddress,
      deliveryPinCode,
      deliveryPhoneNumber,
      notes: notes || undefined,
      // Optional: older app builds send none and are charged the current total.
      expectedTotalPaise,
    });

    if (!validation.success) {
      return apiError(validation.error.issues[0]?.message ?? "Invalid form data.", 400);
    }

    const body = validation.data;

    if (screenshotFile && screenshotFile.size > 0) {
      const { error } = validatePendingUpload("payment-screenshot", screenshotFile);
      if (error) {
        return apiError(error, 400);
      }
    }

    const result = await createBookOrder({
      userId: user.id,
      input: body,
      screenshotFile: screenshotFile && screenshotFile.size > 0 ? screenshotFile : null,
    });

    if (!result.ok) {
      return apiError(result.error, result.status);
    }

    return NextResponse.json({
      success: true,
      message: "Order submitted successfully for Admin approval.",
      orderId: result.order.id,
      order: result.order,
    });
  } catch (error) {
    return apiServerError("api/v1/bookstore/orders", error, "Database operation failed. Please try again.");
  }
}
