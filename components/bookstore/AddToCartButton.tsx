"use client";

import { useCart } from "@/components/bookstore/CartProvider";
import type { BookStatus } from "@prisma/client";

type AddToCartButtonProps = {
  bookId: string;
  title: string;
  author: string;
  priceInrPaise: number;
  imagePath: string | null;
  status: BookStatus;
};

export function AddToCartButton({
  bookId,
  title,
  author,
  priceInrPaise,
  imagePath,
  status,
}: AddToCartButtonProps) {
  const { addItem, removeItem, isInCart } = useCart();
  const inCart = isInCart(bookId);
  const unavailable = status !== "AVAILABLE";

  if (unavailable) {
    return (
      <button
        type="button"
        disabled
        className="w-full rounded-full bg-border px-4 py-2.5 text-sm font-semibold text-muted cursor-not-allowed"
      >
        {status === "OUT_OF_STOCK" ? "Out of Stock" : "Coming Soon"}
      </button>
    );
  }

  if (inCart) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => removeItem(bookId)}
          className="flex-1 rounded-full border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          Remove from Cart
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => addItem({ bookId, title, author, priceInrPaise, imagePath })}
      className="w-full rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
    >
      Add to Cart
    </button>
  );
}
