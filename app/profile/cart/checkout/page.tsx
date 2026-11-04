import type { Metadata } from "next";
import { formatPrice } from "@/utils/money";
import Link from "next/link";
import { redirect } from "next/navigation";
import { bookstoreCheckoutSchema } from "@/utils/validations";
import { BookCheckoutClient } from "@/components/bookstore/BookCheckoutClient";
import { CartStaleNotice } from "@/components/bookstore/CartStaleNotice";
import { PaymentDetailsPanel } from "@/components/payment/PaymentDetailsPanel";
import { getPaymentSettings } from "@/services/payment-settings";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";
import { computeShippingCharge, getShippingSlabs } from "@/services/book-orders";
import { requireUser } from "@/services/auth-actions";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Submit your book order and payment details for approval.",
};

export default async function CartCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ books?: string }>;
}) {
  await requireUser();
  const params = await searchParams;

  let selectedItems: { bookId: string; quantity: number }[] = [];
  if (params.books) {
    let parsedItems = null;
    try {
      parsedItems = bookstoreCheckoutSchema.shape.items.safeParse(
        JSON.parse(decodeURIComponent(params.books)),
      );
    } catch {
      // Malformed JSON or URI encoding falls through to the redirect below.
    }
    if (!parsedItems?.success) {
      redirect("/profile/cart");
    }
    selectedItems = parsedItems.data;
  }

  if (selectedItems.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">Checkout</h2>
        <p className="text-sm text-muted">
          No items selected. Go back to your cart and select books to purchase.
        </p>
      </div>
    );
  }

  const bookIds = selectedItems.map((i) => i.bookId);
  const books = await withDbErrorHandling(() => prisma.book.findMany({
      where: { id: { in: bookIds }, published: true, status: "AVAILABLE" },
    }), "Database operation failed");


  // Books that were unpublished, went out of stock or were deleted since they
  // were added: report them and purge them from the student's cart.
  const missingBookIds = selectedItems
    .filter((selected) => !books.some((b) => b.id === selected.bookId))
    .map((selected) => selected.bookId);

  const resolvedItems = selectedItems
    .map((selected) => {
      const book = books.find((b) => b.id === selected.bookId);
      if (!book) return null;
      return {
        bookId: book.id,
        title: book.title,
        author: book.author,
        priceInrPaise: book.priceInrPaise,
        mrpInrPaise: book.mrpInrPaise,
        imagePath: book.imagePath,
        quantity: selected.quantity,
        weightInGrams: book.weightInGrams,
      };
    })
    .filter(Boolean) as {
    bookId: string;
    title: string;
    author: string;
    priceInrPaise: number;
    mrpInrPaise: number;
    imagePath: string | null;
    quantity: number;
    weightInGrams: number;
  }[];

  if (resolvedItems.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="font-serif text-lg font-semibold text-foreground">Checkout</h2>
        <CartStaleNotice missingBookIds={missingBookIds} />
        <p className="text-sm text-muted">
          None of the selected books are available any more.{" "}
          <Link href="/profile/cart" className="font-medium text-primary hover:underline">
            Back to your cart
          </Link>
        </p>
      </div>
    );
  }

  const subtotalInrPaise = resolvedItems.reduce(
    (sum, i) => sum + i.priceInrPaise * i.quantity,
    0,
  );

  const totalWeightGrams = resolvedItems.reduce(
    (sum, i) => sum + i.weightInGrams * i.quantity,
    0,
  );

  // Shipping preview uses the same rule as order submission.
  const shippingChargeInrPaise = computeShippingCharge(totalWeightGrams, await getShippingSlabs());

  const paymentSettings = await getPaymentSettings();
  const totalAmountInrPaise = subtotalInrPaise + shippingChargeInrPaise;

  const amountLabel = formatPrice(totalAmountInrPaise, { exact: true });

  return (
    <div>
      <Link href="/profile/cart" className="inline-flex items-center gap-1.5 shrink-0 text-sm font-medium text-primary hover:underline">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Cart
      </Link>

      <h2 className="mt-3 font-serif text-lg font-semibold text-foreground">Checkout</h2>
      <p className="mt-1 text-sm text-muted">
        Review your order, transfer the payment, then fill in the details below.
      </p>
      {missingBookIds.length > 0 && (
        <div className="mt-4">
          <CartStaleNotice missingBookIds={missingBookIds} />
        </div>
      )}

      <div className="mx-auto mt-8 max-w-5xl space-y-8">
        <PaymentDetailsPanel
          settings={paymentSettings}
          amountLabel={amountLabel}
          amountPaise={totalAmountInrPaise}
          paymentNote="Bookstore order"
        />

        <div className="card-elevated p-6 sm:p-8">
          <BookCheckoutClient
            items={resolvedItems}
            totalAmountInrPaise={totalAmountInrPaise}
            shippingChargeInrPaise={shippingChargeInrPaise}
          />
        </div>
      </div>
    </div>
  );
}
