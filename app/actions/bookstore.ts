"use server";

import { auth } from "@/services/auth";
import { validatePaymentScreenshot } from "@/services/payment-upload";
import { bookstoreCheckoutSchema } from "@/utils/validations";
import { createBookOrder } from "@/services/book-orders";

export async function submitBookOrder(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorised. Please log in.", status: 401 };
  if (!session.user.emailVerified) return { error: "Please verify your email to place a book order.", status: 403 };

  const userId = session.user.id;
  const rawItems = formData.get("items");
  const screenshot = formData.get("screenshot");
  const screenshotFile = screenshot instanceof File ? screenshot : null;

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

  if (screenshotFile && screenshotFile.size > 0) {
    const { error } = validatePaymentScreenshot(screenshotFile);
    if (error) return { error, status: 400 };
  }

  const result = await createBookOrder({ userId, input: validation.data, screenshotFile });
  if (!result.ok) return { error: result.error, status: result.status };

  return { orderId: result.order.id, redirectUrl: "/profile/cart?submitted=1" };
}
