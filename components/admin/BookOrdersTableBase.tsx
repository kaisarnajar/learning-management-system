"use client";

import Image from "next/image";
import { useState } from "react";
import type { BookOrderWithItems } from "@/lib/bookstore";

export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function ScreenshotPreview({ path }: { path: string }) {
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

export function BaseOrderRow({
  order,
  actionSlot,
}: {
  order: BookOrderWithItems;
  actionSlot: React.ReactNode;
}) {
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
      {actionSlot}
    </tr>
  );
}

export function BookOrdersTableBase({
  orders,
  emptyMessage,
  lastColumnHeader = "",
  lastColumnClassName = "",
  renderActionCell,
}: {
  orders: BookOrderWithItems[];
  emptyMessage: string;
  lastColumnHeader?: string;
  lastColumnClassName?: string;
  renderActionCell: (order: BookOrderWithItems) => React.ReactNode;
}) {
  if (orders.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-border bg-background/50 text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Delivery Address</th>
            <th className="px-4 py-3 font-medium">Books</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className={`px-4 py-3 font-medium ${lastColumnClassName}`}>
              {lastColumnHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <BaseOrderRow
              key={order.id}
              order={order}
              actionSlot={renderActionCell(order)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
