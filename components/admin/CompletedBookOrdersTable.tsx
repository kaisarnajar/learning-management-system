"use client";

import { bookOrderStatusLabel, bookOrderStatusClass } from "@/lib/bookstore";
import type { BookOrderWithItems } from "@/lib/bookstore";
import { BookOrdersTableBase } from "./BookOrdersTableBase";

export function CompletedBookOrdersTable({
  orders,
  emptyMessage = "No completed book orders.",
}: {
  orders: BookOrderWithItems[];
  emptyMessage?: string;
}) {
  return (
    <BookOrdersTableBase
      orders={orders}
      emptyMessage={emptyMessage}
      lastColumnHeader="Status"
      lastColumnClassName="text-right"
      renderActionCell={(order) => (
        <td className="whitespace-nowrap px-4 py-4 align-top text-right">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bookOrderStatusClass(
              order.status
            )}`}
          >
            {bookOrderStatusLabel(order.status)}
          </span>
        </td>
      )}
    />
  );
}
