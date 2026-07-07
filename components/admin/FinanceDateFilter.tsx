import Link from "next/link";
import {
  buildFinanceQueryString,
  FINANCE_DATE_PRESETS,
  type FinanceFilters,
} from "@/services/finance-filters";

type FinanceDateFilterProps = {
  filters: FinanceFilters;
};

function hiddenFilterFields(filters: FinanceFilters, exclude: ("preset" | "from" | "to")[] = []) {
  const fields: { name: string; value: string }[] = [];

  if (filters.courseId) fields.push({ name: "courseId", value: filters.courseId });
  if (filters.studentId) fields.push({ name: "studentId", value: filters.studentId });
  if (filters.paymentType) fields.push({ name: "paymentType", value: filters.paymentType });
  if (filters.category) fields.push({ name: "category", value: filters.category });
  if (filters.teacherId) fields.push({ name: "teacherId", value: filters.teacherId });
  if (filters.q) fields.push({ name: "q", value: filters.q });
  if (filters.tab === "expenses") fields.push({ name: "tab", value: "expenses" });

  if (!exclude.includes("preset") && filters.preset === "custom") {
    fields.push({ name: "preset", value: "custom" });
  }
  if (!exclude.includes("from") && filters.from) {
    fields.push({ name: "from", value: filters.from.toISOString().slice(0, 10) });
  }
  if (!exclude.includes("to") && filters.to) {
    fields.push({ name: "to", value: filters.to.toISOString().slice(0, 10) });
  }

  return fields;
}

export function FinanceDateFilter({ filters }: FinanceDateFilterProps) {
  const customFrom = filters.from?.toISOString().slice(0, 10) ?? "";
  const customTo = filters.to?.toISOString().slice(0, 10) ?? "";

  return (
    <div className="space-y-4">
      <nav className="flex flex-wrap gap-2" aria-label="Date range">
        {FINANCE_DATE_PRESETS.map((item) => {
          const active = filters.preset === item.preset;
          const href = `/admin/finance${buildFinanceQueryString({
            courseId: filters.courseId,
            studentId: filters.studentId,
            paymentType: filters.paymentType,
            category: filters.category,
            teacherId: filters.teacherId,
            tab: filters.tab,
            q: filters.q,
            preset: item.preset,
          })}`;

          return (
            <Link
              key={item.preset}
              href={href}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                active
                  ? "bg-primary text-white"
                  : "border border-border text-foreground hover:bg-accent-muted/50"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <form
        method="get"
        action="/admin/finance"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
      >
        <input type="hidden" name="preset" value="custom" />
        {hiddenFilterFields(filters, ["preset", "from", "to"]).map((field) => (
          <input key={field.name} type="hidden" name={field.name} value={field.value} />
        ))}
        <div>
          <label htmlFor="finance-from" className="block text-xs font-medium text-muted">
            From
          </label>
          <input
            id="finance-from"
            name="from"
            type="date"
            defaultValue={customFrom}
            className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="finance-to" className="block text-xs font-medium text-muted">
            To
          </label>
          <input
            id="finance-to"
            name="to"
            type="date"
            defaultValue={customTo}
            className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Apply dates
        </button>
      </form>
    </div>
  );
}
