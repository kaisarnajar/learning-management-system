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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`Delete "${bookTitle}"? This cannot be undone.`)) return;
    setLoading(true);
    setError("");
    const result = await deleteBook(bookId);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    router.refresh();
    router.push("/admin/bookstore?deleted=1");
  }

  return (
    <span>
      {error && <span className="mr-2 text-xs text-red-600">{error}</span>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
      >
        {loading ? "Deleting…" : "Delete"}
      </button>
    </span>
  );
}
