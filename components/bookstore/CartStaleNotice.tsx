"use client";

import { useEffect } from "react";
import { useCart } from "@/components/bookstore/CartProvider";

/**
 * Tells the student that books were dropped from the cart because they are no
 * longer published or in stock. `missingBookIds` lets a server-rendered page
 * (checkout) report ids it could not resolve; they are purged from the cart
 * once the cart has been read from localStorage.
 */
export function CartStaleNotice({ missingBookIds = [] }: { missingBookIds?: string[] }) {
  const { hydrated, staleItems, removeItem, dismissStale } = useCart();
  const missingKey = missingBookIds.join(",");

  useEffect(() => {
    if (!hydrated || !missingKey) return;
    for (const bookId of missingKey.split(",")) removeItem(bookId);
  }, [hydrated, missingKey, removeItem]);

  const titles = staleItems.map((item) => item.title);
  const unnamedCount = missingBookIds.length;
  if (titles.length === 0 && unnamedCount === 0) return null;

  return (
    <div
      role="status"
      className="rounded-md border border-border bg-warning-bg px-4 py-3 text-sm text-warning-text"
    >
      <p className="font-medium">
        {titles.length > 0
          ? `${titles.length === 1 ? "A book" : `${titles.length} books`} in your cart ${titles.length === 1 ? "is" : "are"} no longer available and ${titles.length === 1 ? "was" : "were"} removed.`
          : `${unnamedCount === 1 ? "A selected book is" : `${unnamedCount} selected books are`} no longer available and ${unnamedCount === 1 ? "was" : "were"} removed from your cart.`}
      </p>
      {titles.length > 0 && <p className="mt-1">{titles.join(", ")}</p>}
      {titles.length > 0 && (
        <button
          type="button"
          onClick={dismissStale}
          className="mt-2 text-xs font-semibold underline hover:no-underline"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
