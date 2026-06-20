"use client";

import { deleteExpenseById } from "@/app/admin/finance/actions";
import type { FinanceSearchParams } from "@/lib/finance-filters";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

type DeleteExpenseButtonProps = {
  id: string;
  returnQuery: FinanceSearchParams;
};

export function DeleteExpenseButton({ id, returnQuery }: DeleteExpenseButtonProps) {
  return (
    <DeleteActionButton
      itemName="expense"
      action={async () => {
        const result = await deleteExpenseById(id, returnQuery);
        if ("error" in result && result.error) return { error: result.error };
        // Assuming deleteExpenseById internally redirects via next/navigation
      }}
    />
  );
}
