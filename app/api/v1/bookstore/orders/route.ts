import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getBookOrdersForUser } from "@/services/bookstore";
import { validatePaymentScreenshot } from "@/services/payment-upload";
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
    console.error("[api/v1/bookstore/orders] GET Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookstore orders." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    let rawItems: string | null = null;
    let paymentMethod: string | null = null;
    let upiTransactionId: string | null = null;
    let deliveryAddress: string | null = null;
    let deliveryPinCode: string | null = null;
    let deliveryPhoneNumber: string | null = null;
    let notes: string | null = null;
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
      screenshotFile = formData.get("screenshot") as File | null;
    } else {
      const bodyJson = await request.json();
      rawItems = typeof bodyJson.items === "string" ? bodyJson.items : JSON.stringify(bodyJson.items);
      paymentMethod = bodyJson.paymentMethod;
      upiTransactionId = bodyJson.upiTransactionId;
      deliveryAddress = bodyJson.deliveryAddress;
      deliveryPinCode = bodyJson.deliveryPinCode;
      deliveryPhoneNumber = bodyJson.deliveryPhoneNumber;
      notes = bodyJson.notes || null;
    }

    if (!rawItems) {
      return NextResponse.json({ success: false, error: "No items provided." }, { status: 400 });
    }

    let parsedItems;
    try {
      parsedItems = typeof rawItems === "string" ? JSON.parse(rawItems) : rawItems;
    } catch {
      return NextResponse.json({ success: false, error: "Invalid items format." }, { status: 400 });
    }

    const validation = bookstoreCheckoutSchema.safeParse({
      items: parsedItems,
      paymentMethod,
      upiTransactionId,
      deliveryAddress,
      deliveryPinCode,
      deliveryPhoneNumber,
      notes: notes || undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message ?? "Invalid form data." },
        { status: 400 }
      );
    }

    const body = validation.data;

    if (screenshotFile && screenshotFile.size > 0) {
      const { error } = validatePaymentScreenshot(screenshotFile);
      if (error) {
        return NextResponse.json({ success: false, error }, { status: 400 });
      }
    }

    const result = await createBookOrder({
      userId: user.id,
      input: body,
      screenshotFile: screenshotFile && screenshotFile.size > 0 ? screenshotFile : null,
    });

    if (!result.ok) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      message: "Order submitted successfully for Admin approval.",
      orderId: result.order.id,
      order: result.order,
    });
  } catch (error) {
    console.error("[api/v1/bookstore/orders] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Database operation failed. Please try again." },
      { status: 500 }
    );
  }
}
