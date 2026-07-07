"use client";

import { bookStatusLabel, bookStatusClass } from "@/services/bookstore";
import type { BookStatus } from "@prisma/client";

export function BookStatusBadge({ status }: { status: BookStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bookStatusClass(status)}`}
    >
      {bookStatusLabel(status)}
    </span>
  );
}
