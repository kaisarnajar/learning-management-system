import Link from "next/link";
import { RecordExpenseForm } from "@/components/admin/RecordExpenseForm";
import { getAllTeachers } from "@/lib/teachers";

export default async function AdminRecordExpensePage() {
  const teachers = await getAllTeachers();

  return (
    <div>
      <Link
        href="/admin/transactions?tab=expenses"
        className="text-sm text-primary hover:underline"
      >
        ← Back to Transactions
      </Link>

      <h1 className="mt-4 font-serif text-2xl font-bold text-primary">Record expense</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Log operational costs such as teacher salaries, website hosting, or marketing spend. The
        entry will appear on the Finance expenses tab.
      </p>

      <div className="mt-8 max-w-2xl">
        <RecordExpenseForm teachers={teachers.map((t) => ({ id: t.id, name: t.name }))} />
      </div>
    </div>
  );
}
