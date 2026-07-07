import { expenseCategoryLabel } from "@/services/expense-categories";
import { formatPrice } from "@/services/courses";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";
import { deleteExpenseById } from "@/app/admin/finance/actions";

type ExpenseRecord = {
  id: string;
  category: string;
  amountInrPaise: number;
  paidAt: Date;
  description: string | null;
  teacher: { id: string; name: string } | null;
};

import type { FinanceSearchParams } from "@/services/finance-filters";

type FinanceExpenseTableProps = {
  expenses: ExpenseRecord[];
  returnQuery: FinanceSearchParams;
  basePath?: string;
};

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function FinanceExpenseTable({ expenses, returnQuery, basePath = "/admin/finance" }: FinanceExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">No expenses for these filters.</p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-ui-880 text-left text-sm">
      <thead className="border-b border-border bg-background/50 text-xs uppercase tracking-wide text-muted">
        <tr>
          <th className="px-4 py-3 font-medium">Date</th>
          <th className="px-4 py-3 font-medium">Category</th>
          <th className="px-4 py-3 font-medium">Teacher</th>
          <th className="px-4 py-3 font-medium">Amount</th>
          <th className="px-4 py-3 font-medium">Description</th>
          <th className="px-4 py-3 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {expenses.map((expense) => (
          <tr key={expense.id} className="hover:bg-background/30">
            <td className="px-4 py-3 text-muted">{formatDate(expense.paidAt)}</td>
            <td className="px-4 py-3 text-muted">{expenseCategoryLabel(expense.category)}</td>
            <td className="px-4 py-3 text-muted">{expense.teacher?.name ?? "—"}</td>
            <td className="px-4 py-3 font-medium text-destructive-text">{formatPrice(expense.amountInrPaise)}</td>
            <td className="px-4 py-3 text-muted">{expense.description ?? "—"}</td>
            <td className="px-4 py-3">
              <DeleteActionButton action={deleteExpenseById.bind(null, expense.id, returnQuery, basePath)} itemName="expense" />
            </td>
          </tr>
        ))}
      </tbody>
      </table>
    </div>
  );
}
