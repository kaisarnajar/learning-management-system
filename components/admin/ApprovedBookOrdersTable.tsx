"use client";

import { useState } from "react";
import { markBookOrderShipped, markBookOrderRefunded } from "@/app/admin/bookstore/orders/actions";
import type { BookOrderWithItems } from "@/lib/bookstore";
import { BookOrdersTableBase } from "./BookOrdersTableBase";

export function ApprovedBookOrdersTable({
  orders,
  emptyMessage = "No approved book orders awaiting shipment.",
}: {
  orders: BookOrderWithItems[];
  emptyMessage?: string;
}) {
  return (
    <BookOrdersTableBase
      orders={orders}
      emptyMessage={emptyMessage}
      renderActionCell={(order) => <ApprovedOrderActions order={order} />}
    />
  );
}

function ApprovedOrderActions({ order }: { order: BookOrderWithItems }) {
  const [loading, setLoading] = useState<"shipped" | "refunded" | null>(null);
  const [error, setError] = useState("");

  async function handleShipped() {
    if (!window.confirm("Mark this book order as shipped and notify the student?")) return;
    setLoading("shipped");
    setError("");
    const result = await markBookOrderShipped(order.id);
    if (result?.error) {
      setError(result.error);
      setLoading(null);
    }
  }

  async function handleRefunded() {
    if (!window.confirm("Are you sure you want to refund this order? The student will be notified.")) return;
    setLoading("refunded");
    setError("");
    const result = await markBookOrderRefunded(order.id);
    if (result?.error) {
      setError(result.error);
      setLoading(null);
    }
  }

  return (
    <td className="whitespace-nowrap px-4 py-4 align-top">
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleShipped}
          disabled={loading !== null}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60 transition-colors"
        >
          {loading === "shipped" ? "Updating…" : "Mark as Shipped"}
        </button>
        <button
          type="button"
          onClick={handleRefunded}
          disabled={loading !== null}
          className="rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-muted-hover disabled:opacity-60 transition-colors"
        >
          {loading === "refunded" ? "Updating…" : "Refund"}
        </button>
      </div>
    </td>
  );
}
