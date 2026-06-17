"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteExpenseById } from "@/app/admin/finance/actions";
import type { FinanceSearchParams } from "@/lib/finance-filters";

type DeleteExpenseButtonProps = {
  id: string;
  returnQuery: FinanceSearchParams;
};

export function DeleteExpenseButton({ id, returnQuery }: DeleteExpenseButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Delete this expense? This cannot be undone.")) return;

    setLoading(true);
    const result = await deleteExpenseById(id, returnQuery);
    setLoading(false);

    if (result.error) {
      window.alert(result.error);
      return;
    }

    if (result.redirectTo) {
      router.push(result.redirectTo);
    }
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
