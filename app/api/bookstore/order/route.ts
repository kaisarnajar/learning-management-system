import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePaymentScreenshot, savePaymentScreenshot } from "@/lib/payment-upload";
import { bookstoreCheckoutSchema } from "@/lib/validations";
import { withDbErrorHandling } from "@/lib/db-error";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised. Please log in." }, { status: 401 });
  }

  const userId = session.user.id;

  // Parse multipart form data
  const formData = await req.formData();
  const rawItems = formData.get("items");
  const screenshotFile = formData.get("screenshot") as File | null;

  if (!rawItems) {
    return NextResponse.json({ error: "No items provided." }, { status: 400 });
  }

  let parsedItems;
  try {
    parsedItems = JSON.parse(rawItems as string);
  } catch (error) {
    if (isRedirectError(error)) { throw error; }
    console.error("Caught error:", error);
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

  const validation = bookstoreCheckoutSchema.safeParse({
    items: parsedItems,
    paymentMethod: formData.get("paymentMethod"),
    upiTransactionId: formData.get("upiTransactionId"),
    deliveryAddress: formData.get("deliveryAddress"),
    deliveryPinCode: formData.get("deliveryPinCode"),
    deliveryPhoneNumber: formData.get("deliveryPhoneNumber"),
    notes: formData.get("notes") || undefined,
  });

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0]?.message ?? "Invalid form data." },
      { status: 400 },
    );
  }

  const body = validation.data;

  // Validate screenshot
  if (screenshotFile && screenshotFile.size > 0) {
    const { error } = validatePaymentScreenshot(screenshotFile);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  }

  // Fetch books and verify all exist and are AVAILABLE
  const bookIds = body.items.map((i) => i.bookId);
  const books = await withDbErrorHandling(() => prisma.book.findMany({
      where: { id: { in: bookIds }, published: true },
    }), "Database operation failed");

  if (books.length !== bookIds.length) {
    return NextResponse.json(
      { error: "One or more books are unavailable." },
      { status: 400 },
    );
  }

  const unavailable = books.filter((b) => b.status !== "AVAILABLE");
  if (unavailable.length > 0) {
    return NextResponse.json(
      {
        error: `Some books are not available: ${unavailable.map((b) => b.title).join(", ")}`,
      },
      { status: 400 },
    );
  }

  // Calculate total
  const bookPriceMap = new Map(books.map((b) => [b.id, b.priceInrPaise]));
  let totalAmountInrPaise = 0;
  for (const item of body.items) {
    const price = bookPriceMap.get(item.bookId);
    if (price === undefined) {
      return NextResponse.json({ error: "Invalid book in cart." }, { status: 400 });
    }
    totalAmountInrPaise += price * item.quantity;
  }

  // Save screenshot if provided
  let paymentScreenshotPath: string | null = null;
  if (screenshotFile && screenshotFile.size > 0) {
    const tempId = `book-order-${userId}-${Date.now()}`;
    paymentScreenshotPath = await savePaymentScreenshot(tempId, screenshotFile);
  }

  // Create order
  const order = await withDbErrorHandling(() => prisma.bookOrder.create({
      data: {
        userId,
        totalAmountInrPaise,
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
            priceAtPurchaseInrPaise: bookPriceMap.get(item.bookId)!,
          })),
        },
      },
    }), "Database operation failed");

  return NextResponse.json({ orderId: order.id, redirectUrl: "/profile/cart?submitted=1" });
}
