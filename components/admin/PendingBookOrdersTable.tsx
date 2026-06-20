"use client";

import { useState } from "react";
import { approveBookOrder, declineBookOrder } from "@/app/admin/bookstore/orders/actions";
import type { BookOrderWithItems } from "@/lib/bookstore";
import { BookOrdersTableBase } from "./BookOrdersTableBase";

export function PendingBookOrdersTable({
  orders,
  emptyMessage = "No pending book orders.",
}: {
  orders: BookOrderWithItems[];
  emptyMessage?: string;
}) {
  return (
    <BookOrdersTableBase
      orders={orders}
      emptyMessage={emptyMessage}
      renderActionCell={(order) => <PendingOrderActions order={order} />}
    />
  );
}

function PendingOrderActions({ order }: { order: BookOrderWithItems }) {
  const [loading, setLoading] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState("");

  async function handleApprove() {
    if (!window.confirm("Approve this book order and notify the student?")) return;
    setLoading("approve");
    setError("");
    const result = await approveBookOrder(order.id);
    if (result?.error) {
      setError(result.error);
      setLoading(null);
    }
  }

  async function handleDecline() {
    if (!window.confirm("Are you sure you want to decline this order?")) return;
    setLoading("decline");
    setError("");
    const result = await declineBookOrder(order.id);
    if (result?.error) {
      setError(result.error);
      setLoading(null);
    }
  }

  return (
    <td className="whitespace-nowrap px-4 py-4 align-top">
      {error && <p className="mb-2 text-xs text-destructive-text">{error}</p>}
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
          className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60"
        >
          {loading === "decline" ? "Declining…" : "Decline"}
        </button>
      </div>
    </td>
  );
}
