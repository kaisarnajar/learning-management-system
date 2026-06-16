import type { Metadata } from "next";
import { BookCheckoutClient } from "@/components/bookstore/BookCheckoutClient";
import { requireUser } from "@/lib/auth-actions";
import { prisma } from "@/lib/prisma";
import { getPaymentSettings } from "@/lib/payment-settings";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Submit your book order and payment details for approval.",
};

export default async function CartCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ books?: string }>;
}) {
  const session = await requireUser();
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
  const books = await prisma.book.findMany({
    where: { id: { in: bookIds }, published: true, status: "AVAILABLE" },
  });

  const paymentSettings = await getPaymentSettings();

  const resolvedItems = selectedItems
    .map((selected) => {
      const book = books.find((b) => b.id === selected.bookId);
      if (!book) return null;
      return {
        bookId: book.id,
        title: book.title,
        author: book.author,
        priceInrPaise: book.priceInrPaise,
        imagePath: book.imagePath,
        quantity: selected.quantity,
      };
    })
    .filter(Boolean) as {
    bookId: string;
    title: string;
    author: string;
    priceInrPaise: number;
    imagePath: string | null;
    quantity: number;
  }[];

  const totalAmountInrPaise = resolvedItems.reduce(
    (sum, i) => sum + i.priceInrPaise * i.quantity,
    0,
  );

  return (
    <BookCheckoutClient
      items={resolvedItems}
      totalAmountInrPaise={totalAmountInrPaise}
      upiId={paymentSettings.upiId}
      upiPayeeName={paymentSettings.upiPayeeName}
      bankDetails={{
        accountName: paymentSettings.bankAccountName,
        bankName: paymentSettings.bankName,
        accountNumber: paymentSettings.bankAccountNumber,
        ifsc: paymentSettings.bankIfsc,
        branch: paymentSettings.bankBranch,
      }}
    />
  );
}
