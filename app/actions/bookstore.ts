"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePaymentScreenshot, savePaymentScreenshot } from "@/lib/payment-upload";
import { bookstoreCheckoutSchema } from "@/lib/validations";

export async function submitBookOrder(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorised. Please log in.", status: 401 };
  if (!session.user.emailVerified) return { error: "Please verify your email to place a book order.", status: 403 };

  const userId = session.user.id;
  const rawItems = formData.get("items");
  const screenshotFile = formData.get("screenshot") as File | null;

  if (!rawItems) return { error: "No items provided.", status: 400 };

  let parsedItems;
  try {
    parsedItems = JSON.parse(rawItems as string);
  } catch {
    return { error: "Invalid request body.", status: 400 };
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
    return { error: validation.error.issues[0]?.message ?? "Invalid form data.", status: 400 };
  }

  const body = validation.data;

  if (screenshotFile && screenshotFile.size > 0) {
    const { error } = validatePaymentScreenshot(screenshotFile);
    if (error) return { error, status: 400 };
  }

  const bookIds = body.items.map((i) => i.bookId);
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds }, published: true },
  });

  if (books.length !== bookIds.length) return { error: "One or more books are unavailable.", status: 400 };

  const unavailable = books.filter((b) => b.status !== "AVAILABLE");
  if (unavailable.length > 0) {
    return { error: `Some books are not available: ${unavailable.map((b) => b.title).join(", ")}`, status: 400 };
  }

  const bookMap = new Map(books.map((b) => [b.id, b]));
  let subtotalAmountInrPaise = 0;
  let totalWeightGrams = 0;

  for (const item of body.items) {
    const book = bookMap.get(item.bookId);
    if (!book) return { error: "Invalid book in cart.", status: 400 };
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
    const tempId = `book-order-${userId}-${Date.now()}`;
    paymentScreenshotPath = await savePaymentScreenshot(tempId, screenshotFile);
  }

  try {
    const order = await prisma.bookOrder.create({
      data: {
        userId,
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
    });

    return { orderId: order.id, redirectUrl: "/profile/cart?submitted=1" };
  } catch (error) {
    console.error("Database operation failed:", error);
    return { error: "Database operation failed. Please try again.", status: 500 };
  }
}
