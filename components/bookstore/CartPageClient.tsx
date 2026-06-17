"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useCart } from "@/components/bookstore/CartProvider";
import { bookOrderStatusLabel, bookOrderStatusClass } from "@/lib/bookstore";

type OrderItem = {
  id: string;
  quantity: number;
  priceAtPurchaseInrPaise: number;
  book: { id: string; title: string; author: string; imagePath: string | null };
};

type PastOrder = {
  id: string;
  totalAmountInrPaise: number;
  status: string;
  createdAt: Date;
  items: OrderItem[];
};

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function PastOrderCard({ order }: { order: PastOrder }) {
  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-surface p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
          <p className="mt-1 font-semibold text-foreground">
            {formatPrice(order.totalAmountInrPaise)}
          </p>
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${bookOrderStatusClass(order.status)}`}
        >
          {bookOrderStatusLabel(order.status)}
        </span>
      </div>

      <ul className="mt-3 space-y-2 border-t border-border pt-3">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 text-sm">
            <div className="h-10 w-8 shrink-0 overflow-hidden rounded bg-accent-muted/30">
              {item.book.imagePath ? (
                <Image
                  src={item.book.imagePath}
                  alt={item.book.title}
                  width={32}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-muted">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate font-medium text-foreground">{item.book.title}</p>
              <p className="text-xs text-muted">{item.book.author}</p>
            </div>
            <div className="shrink-0 text-right text-xs text-muted">
              × {item.quantity}
              <span className="ml-2 text-foreground font-medium">
                {formatPrice(item.priceAtPurchaseInrPaise * item.quantity)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CartPageClient({
  submitted,
  orders,
}: {
  submitted: boolean;
  orders: PastOrder[];
}) {
  const { items, totalAmount, totalCount, updateQuantity, removeItem } = useCart();
  const [selected, setSelected] = useState<Set<string>>(new Set(items.map((i) => i.bookId)));
  const [showSuccess, setShowSuccess] = useState(submitted);

  useEffect(() => {
    if (submitted) {
      // Remove ?submitted=1 from the URL without triggering a page reload
      const url = new URL(window.location.href);
      url.searchParams.delete("submitted");
      window.history.replaceState({}, "", url.toString());
    }
  }, [submitted]);

  const selectedItems = items.filter((i) => selected.has(i.bookId));
  const selectedTotal = selectedItems.reduce(
    (sum, i) => sum + i.priceInrPaise * i.quantity,
    0,
  );

  function toggleSelect(bookId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bookId)) next.delete(bookId);
      else next.add(bookId);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(items.map((i) => i.bookId)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-lg font-semibold text-foreground">My Cart</h2>
        <p className="mt-1 text-sm text-muted">
          Select the books you want to buy, then proceed to checkout.
        </p>
      </div>

      {showSuccess && (
        <div className="relative rounded-lg border border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50 px-4 py-4 pr-10 text-sm text-emerald-900">
          <p className="font-semibold">Order submitted successfully!</p>
          <p className="mt-1">The academy will verify your payment and dispatch your books shortly.</p>
          <button 
            type="button" 
            onClick={() => setShowSuccess(false)}
            className="absolute top-4 right-4 text-emerald-600 hover:text-emerald-800 transition-colors"
            aria-label="Dismiss message"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {totalCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-16 text-center">
          <svg className="h-12 w-12 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <p className="mt-4 font-serif text-base font-semibold text-foreground">Your cart is empty</p>
          <p className="mt-1 text-sm text-muted">Browse our bookstore to add books.</p>
          <Link
            href="/bookstore"
            className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-light transition-colors"
          >
            Browse Bookstore
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button type="button" onClick={selectAll} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-accent-muted/50 transition-colors">
                Select all
              </button>
              <button type="button" onClick={deselectAll} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-accent-muted/50 transition-colors">
                Deselect all
              </button>
            </div>
            <p className="text-sm text-muted">{totalCount} item{totalCount !== 1 ? "s" : ""} in cart</p>
          </div>

          {/* Cart items */}
          <div className="rounded-xl border border-border bg-surface divide-y divide-border">
            {items.map((item) => {
              const isSelected = selected.has(item.bookId);
              return (
                <div key={item.bookId} className={`flex items-start gap-4 p-4 transition-colors ${!isSelected ? "opacity-50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(item.bookId)}
                    className="mt-1 h-4 w-4 rounded text-primary"
                    aria-label={`Select ${item.title}`}
                  />
                  <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg border border-border">
                    {item.imagePath ? (
                      <Image src={item.imagePath} alt={item.title} width={48} height={64} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-accent-muted/30">
                        <svg className="h-5 w-5 text-muted/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-1">{item.title}</p>
                    <p className="text-sm text-muted">{item.author}</p>
                    <p className="mt-1 font-semibold text-primary">{formatPrice(item.priceInrPaise)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.bookId, item.quantity - 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-accent-muted/50"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-5 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.bookId, item.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-accent-muted/50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.bookId)}
                      className="ml-2 text-muted hover:text-red-600 transition-colors"
                      aria-label={`Remove ${item.title}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""} selected
              </p>
              <p className="font-semibold text-foreground">
                Total: <span className="text-primary">{formatPrice(selectedTotal)}</span>
              </p>
            </div>
            <Link
              href={
                selectedItems.length > 0
                  ? `/profile/cart/checkout?books=${encodeURIComponent(
                      JSON.stringify(selectedItems.map((i) => ({ bookId: i.bookId, quantity: i.quantity }))),
                    )}`
                  : "#"
              }
              aria-disabled={selectedItems.length === 0}
              className={`mt-4 flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold text-white transition-colors ${
                selectedItems.length > 0
                  ? "bg-primary hover:bg-primary-light"
                  : "cursor-not-allowed bg-border text-muted"
              }`}
            >
              Buy Selected ({selectedItems.length})
            </Link>
          </div>
        </div>
      )}

      {/* Past orders */}
      {orders.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Order History</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orders.map((order) => (
              <PastOrderCard key={order.id} order={order} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
