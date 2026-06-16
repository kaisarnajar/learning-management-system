import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePaymentScreenshot, savePaymentScreenshot } from "@/lib/payment-upload";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised. Please log in." }, { status: 401 });
  }

  const userId = session.user.id;

  let body: {
    items: { bookId: string; quantity: number }[];
    paymentMethod: string;
    upiTransactionId?: string;
    notes?: string;
  };

  // Parse multipart form data
  const formData = await req.formData();
  const rawItems = formData.get("items");
  const paymentMethod = formData.get("paymentMethod") as string;
  const upiTransactionId = (formData.get("upiTransactionId") as string) ?? "";
  const notes = (formData.get("notes") as string) ?? "";
  const screenshotFile = formData.get("screenshot") as File | null;

  if (!rawItems) {
    return NextResponse.json({ error: "No items provided." }, { status: 400 });
  }

  try {
    body = { items: JSON.parse(rawItems as string), paymentMethod, upiTransactionId, notes };
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({ error: "Cart is empty." }, { status: 400 });
  }

  if (!paymentMethod) {
    return NextResponse.json({ error: "Payment method is required." }, { status: 400 });
  }

  if (!upiTransactionId.trim()) {
    return NextResponse.json(
      { error: "Transaction / UTR reference is required." },
      { status: 400 },
    );
  }

  // Validate screenshot
  if (screenshotFile && screenshotFile.size > 0) {
    const { error } = validatePaymentScreenshot(screenshotFile);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }
  }

  // Fetch books and verify all exist and are AVAILABLE
  const bookIds = body.items.map((i) => i.bookId);
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds }, published: true },
  });

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
  const order = await prisma.bookOrder.create({
    data: {
      userId,
      totalAmountInrPaise,
      paymentMethod,
      upiTransactionId: upiTransactionId.trim() || null,
      paymentScreenshotPath,
      notes: notes.trim() || null,
      status: "PENDING_VERIFICATION",
      items: {
        create: body.items.map((item) => ({
          bookId: item.bookId,
          quantity: item.quantity,
          priceAtPurchaseInrPaise: bookPriceMap.get(item.bookId)!,
        })),
      },
    },
  });

  return NextResponse.json({ orderId: order.id, redirectUrl: "/profile/cart?submitted=1" });
}
