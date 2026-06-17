"use client";

import Link from "next/link";
import { useCart } from "@/components/bookstore/CartProvider";

export function CartCount() {
  const { totalCount } = useCart();

  if (totalCount === 0) return null;

  return (
    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-semibold text-white">
      {totalCount > 99 ? "99+" : totalCount}
    </span>
  );
}

