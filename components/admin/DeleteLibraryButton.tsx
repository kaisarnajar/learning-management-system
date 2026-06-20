"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteLibraryItemById } from "@/app/admin/library/actions";

type DeleteLibraryButtonProps = {
  id: string;
  label: string;
};

export function DeleteLibraryButton({ id, label }: DeleteLibraryButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const message = `Delete this library item?\n\n${label}\n\nThis cannot be undone.`;
    if (!window.confirm(message)) return;

    setLoading(true);
    const result = await deleteLibraryItemById(id);
    setLoading(false);

    if (result.error) {
      window.alert(result.error);
      return;
    }

    router.push("/admin/library?deleted=1");
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
