"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteBook } from "@/app/admin/bookstore/actions";

export function DeleteBookButton({
  bookId,
  bookTitle,
}: {
  bookId: string;
  bookTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const message = `Delete this book?\n\n${bookTitle}\n\nThis cannot be undone.`;
    if (!window.confirm(message)) return;

    setLoading(true);
    const result = await deleteBook(bookId);
    setLoading(false);

    if (result?.error) {
      window.alert(result.error);
      return;
    }

    router.push("/admin/bookstore?deleted=1");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60"
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}
