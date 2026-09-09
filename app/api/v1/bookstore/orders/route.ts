import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getBookOrdersForUser } from "@/services/bookstore";
import { prisma } from "@/utils/prisma";
import { validatePaymentScreenshot, savePaymentScreenshot } from "@/services/payment-upload";
import { bookstoreCheckoutSchema } from "@/utils/validations";

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

    const bookIds = body.items.map((i) => i.bookId);
    const books = await prisma.book.findMany({
      where: { id: { in: bookIds }, published: true },
    });

    if (books.length !== bookIds.length) {
      return NextResponse.json({ success: false, error: "One or more books are unavailable." }, { status: 400 });
    }

    const unavailable = books.filter((b) => b.status !== "AVAILABLE");
    if (unavailable.length > 0) {
      return NextResponse.json(
        { success: false, error: `Some books are not available: ${unavailable.map((b) => b.title).join(", ")}` },
        { status: 400 }
      );
    }

    const bookMap = new Map(books.map((b) => [b.id, b]));
    let subtotalAmountInrPaise = 0;
    let totalWeightGrams = 0;

    for (const item of body.items) {
      const book = bookMap.get(item.bookId);
      if (!book) return NextResponse.json({ success: false, error: "Invalid book in cart." }, { status: 400 });
      subtotalAmountInrPaise += book.priceInrPaise * item.quantity;
      totalWeightGrams += book.weightInGrams * item.quantity;
    }

    const slabs = await prisma.shippingChargeSlab.findMany({
      orderBy: { maxWeightGrams: "asc" },
    });

    let shippingChargeInrPaise = 0;
    if (slabs.length > 0) {
      const applicableSlab = slabs.find(
        (slab) => totalWeightGrams >= slab.minWeightGrams && totalWeightGrams <= slab.maxWeightGrams
      );
      if (applicableSlab) {
        shippingChargeInrPaise = applicableSlab.chargeInrPaise;
      } else {
        const highestSlab = slabs[slabs.length - 1];
        const lowestSlab = slabs[0];
        if (totalWeightGrams > highestSlab.maxWeightGrams) {
          shippingChargeInrPaise = highestSlab.chargeInrPaise;
        } else if (totalWeightGrams < lowestSlab.minWeightGrams) {
          shippingChargeInrPaise = 0;
        }
      }
    }

    const totalAmountInrPaise = subtotalAmountInrPaise + shippingChargeInrPaise;

    let paymentScreenshotPath: string | null = null;
    if (screenshotFile && screenshotFile.size > 0) {
      const tempId = `book-order-${user.id}-${Date.now()}`;
      paymentScreenshotPath = await savePaymentScreenshot(tempId, screenshotFile);
    }

    const order = await prisma.bookOrder.create({
      data: {
        userId: user.id,
        totalAmountInrPaise,
        shippingChargeInrPaise,
        paymentMethod: body.paymentMethod,
        upiTransactionId: body.upiTransactionId.trim() || null,
        paymentScreenshotPath,
        deliveryAddress: body.deliveryAddress,
        deliveryPinCode: body.deliveryPinCode,
        deliveryPhoneNumber: body.deliveryPhoneNumber,
        notes: body.notes?.trim() || null,
        status: "PENDING_VERIFICATION",
        items: {
          create: body.items.map((item) => ({
            bookId: item.bookId,
            quantity: item.quantity,
            priceAtPurchaseInrPaise: bookMap.get(item.bookId)!.priceInrPaise,
          })),
        },
      },
      include: {
        items: {
          include: {
            book: true,
          },
        },
      },
    });

    await prisma.userCartItem.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      message: "Order submitted successfully for Admin approval.",
      orderId: order.id,
      order,
    });
  } catch (error) {
    console.error("[api/v1/bookstore/orders] POST Error:", error);
    return NextResponse.json(
      { success: false, error: "Database operation failed. Please try again." },
      { status: 500 }
    );
  }
}
