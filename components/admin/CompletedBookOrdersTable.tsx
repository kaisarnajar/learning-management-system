"use client";

import Image from "next/image";
import { useState } from "react";
import { bookOrderStatusLabel, bookOrderStatusClass } from "@/lib/bookstore";
import type { BookOrderWithItems } from "@/lib/bookstore";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function ScreenshotPreview({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-primary underline hover:text-primary-light"
      >
        View screenshot
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal
          aria-label="Payment screenshot"
        >
          <div className="relative max-h-[90vh] max-w-lg overflow-auto rounded-xl bg-surface p-2 shadow-2xl">
            <Image
              src={path}
              alt="Payment screenshot"
              width={600}
              height={800}
              className="rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

function CompletedOrderRow({ order }: { order: BookOrderWithItems }) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-4 align-top">
        <p className="font-medium text-foreground">{order.user.name ?? "—"}</p>
        <p className="mt-0.5 text-xs text-muted">{order.user.email}</p>
        <p className="mt-0.5 text-xs text-muted">
          {order.createdAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </td>
      <td className="px-4 py-4 align-top max-w-[200px]">
        {order.deliveryAddress && order.deliveryAddress !== "No address provided" ? (
          <p className="whitespace-pre-wrap text-sm text-muted">{order.deliveryAddress}</p>
        ) : (
          <p className="text-sm text-muted italic">No address provided</p>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        <ul className="space-y-1">
          {order.items.map((item) => (
            <li key={item.id} className="text-sm text-foreground">
              {item.book.title}{" "}
              <span className="text-muted">
                × {item.quantity} — {formatPrice(item.priceAtPurchaseInrPaise * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-foreground">{formatPrice(order.totalAmountInrPaise)}</p>
      </td>
      <td className="px-4 py-4 align-top text-sm">
        <p className="text-muted capitalize">{order.paymentMethod ?? "—"}</p>
        {order.upiTransactionId && (
          <p className="mt-0.5 break-all font-mono text-xs text-muted">{order.upiTransactionId}</p>
        )}
        {order.paymentScreenshotPath && (
          <div className="mt-1">
            <ScreenshotPreview path={order.paymentScreenshotPath} />
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-4 align-top text-right">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bookOrderStatusClass(
            order.status
          )}`}
        >
          {bookOrderStatusLabel(order.status)}
        </span>
      </td>
    </tr>
  );
}

export function CompletedBookOrdersTable({
  orders,
  emptyMessage = "No completed book orders.",
}: {
  orders: BookOrderWithItems[];
  emptyMessage?: string;
}) {
  if (orders.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>
    );
  }

  return (
    <table className="w-full min-w-[800px] text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Student</th>
          <th className="px-4 py-3 font-medium">Delivery Address</th>
          <th className="px-4 py-3 font-medium">Books</th>
          <th className="px-4 py-3 font-medium">Total</th>
          <th className="px-4 py-3 font-medium">Payment</th>
          <th className="px-4 py-3 font-medium text-right">Status</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <CompletedOrderRow key={order.id} order={order} />
        ))}
      </tbody>
    </table>
  );
}
