import Link from "next/link";
import { RecordPaymentForm } from "@/components/admin/RecordPaymentForm";
import { RecordExpenseForm } from "@/components/admin/RecordExpenseForm";

import { getAllCourses } from "@/lib/courses";
import { getAllTeachers } from "@/lib/teachers";
import { ActionToast } from "@/components/shared/ToastProvider";

type TabType = "payments" | "expenses";

function tabHref(type: TabType) {
  const params = new URLSearchParams();
  if (type !== "payments") params.set("tab", type);
  const qs = params.toString();
  return qs ? `/admin/transactions?${qs}` : "/admin/transactions";
}

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string }>;
}) {
  const params = await searchParams;
  const tab: TabType = params.tab === "expenses" ? "expenses" : "payments";

  const [courses, teachers] = await Promise.all([
    getAllCourses(),
    getAllTeachers(),
  ]);

  const tabs = [
    { label: "Record Payment", value: "payments" as TabType },
    { label: "Record Expense", value: "expenses" as TabType },
  ];

  return (
    <div>
      <h1 className="font-serif text-2xl font-bold text-primary">Record Transactions</h1>
      <p className="mt-1 text-sm text-muted">
        Manually log payments received from students or operational expenses.
      </p>

      <ActionToast trigger={params.saved === "1"} paramName="saved" message="Transaction recorded successfully." variant="info" />
      {params.error && (
        <p className="mt-4 rounded-md bg-destructive-bg px-4 py-3 text-sm text-destructive-text" role="alert">
          {decodeURIComponent(params.error)}
        </p>
      )}

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Transaction type">
        {tabs.map((item) => {
          const active = tab === item.value;
          const href = tabHref(item.value);
          return (
            <Link
              key={item.value}
              href={href}
              className={`inline-flex min-h-10 items-center justify-center rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-primary text-white shadow-sm"
                  : "bg-surface text-foreground hover:bg-accent-muted/50 border border-border"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-8 w-full">
        {tab === "payments" ? (
          <RecordPaymentForm
            courses={courses.map((c) => ({ id: c.id, title: c.title }))}
          />
        ) : (
          <RecordExpenseForm teachers={teachers.map((t) => ({ id: t.id, name: t.name }))} />
        )}
      </div>
    </div>
  );
}
