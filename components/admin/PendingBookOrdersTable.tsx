"use client";

import Image from "next/image";
import { useState } from "react";
import { approveBookOrder, declineBookOrder } from "@/app/admin/bookstore/orders/actions";
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
          <div className="relative max-h-[90vh] max-w-lg overflow-auto rounded-xl bg-white p-2 shadow-2xl">
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

function OrderRow({ order }: { order: BookOrderWithItems }) {
  const [loading, setLoading] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState("");

  async function handleApprove() {
    setLoading("approve");
    setError("");
    const result = await approveBookOrder(order.id);
    if (result?.error) {
      setError(result.error);
      setLoading(null);
    }
  }

  async function handleDecline() {
    if (!confirm("Are you sure you want to decline this order?")) return;
    setLoading("decline");
    setError("");
    const result = await declineBookOrder(order.id);
    if (result?.error) {
      setError(result.error);
      setLoading(null);
    }
  }

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
      <td className="whitespace-nowrap px-4 py-4 align-top">
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleApprove}
            disabled={loading !== null}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60"
          >
            {loading === "approve" ? "Approving…" : "Approve"}
          </button>
          <button
            type="button"
            onClick={handleDecline}
            disabled={loading !== null}
            className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
          >
            {loading === "decline" ? "Declining…" : "Decline"}
          </button>
        </div>
      </td>
    </tr>
  );
}

export function PendingBookOrdersTable({
  orders,
  emptyMessage = "No pending book orders.",
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
          <th className="px-4 py-3 font-medium">Books</th>
          <th className="px-4 py-3 font-medium">Total</th>
          <th className="px-4 py-3 font-medium">Payment</th>
          <th className="px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => (
          <OrderRow key={order.id} order={order} />
        ))}
      </tbody>
    </table>
  );
}
