import type { Metadata } from "next";
import Link from "next/link";
import { BookCheckoutClient } from "@/components/bookstore/BookCheckoutClient";
import { PaymentDetailsPanel } from "@/components/payment/PaymentDetailsPanel";
import { prisma } from "@/lib/prisma";
import { withDbErrorHandling } from "@/lib/db-error";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export const metadata: Metadata = {
  title: "Checkout",
  description: "Submit your book order and payment details for approval.",
};

export default async function CartCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ books?: string }>;
}) {
  const params = await searchParams;

  let selectedItems: { bookId: string; quantity: number }[] = [];
  try {
    if (params.books) {
      selectedItems = JSON.parse(decodeURIComponent(params.books));
    }
  } catch {
    selectedItems = [];
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
  }[];

  const totalAmountInrPaise = resolvedItems.reduce(
    (sum, i) => sum + i.priceInrPaise * i.quantity,
    0,
  );

  const amountLabel = formatPrice(totalAmountInrPaise);

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

      <div className="mx-auto mt-8 max-w-5xl space-y-8">
        <PaymentDetailsPanel
          amountLabel={amountLabel}
          amountPaise={totalAmountInrPaise}
          paymentNote="Bookstore order"
        />

        <div className="card-elevated p-6 sm:p-8">
          <BookCheckoutClient
            items={resolvedItems}
            totalAmountInrPaise={totalAmountInrPaise}
          />
        </div>
      </div>
    </div>
  );
}
