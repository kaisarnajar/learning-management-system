"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteFatwaQuestion } from "@/app/admin/fatwa/actions";

type DeleteFatwaButtonProps = {
  id: string;
  title: string;
};

export function DeleteFatwaButton({ id, title }: DeleteFatwaButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const message = `Delete this fatwa question?\n\n"${title}"\n\nThis cannot be undone.`;
    if (!window.confirm(message)) return;

    setLoading(true);
    const result = await deleteFatwaQuestion(id);
    setLoading(false);

    if (result.error) {
      window.alert(result.error);
      return;
    }

    router.push("/admin/fatwa?deleted=1");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-red-100 disabled:opacity-60"
    >
      {loading ? "…" : "Delete"}
    </button>
  );
}
