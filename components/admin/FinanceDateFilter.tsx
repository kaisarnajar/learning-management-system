import { TabPills } from "@/components/shared/TabPills";
import {
  buildFinanceQueryString,
  FINANCE_DATE_PRESETS,
  type FinanceFilters,
} from "@/services/finance-filters";
import { formatBusinessDate } from "@/services/business-time";

type FinanceDateFilterProps = {
  filters: FinanceFilters;
  basePath?: string;
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
    fields.push({ name: "from", value: formatBusinessDate(filters.from) });
  }
  if (!exclude.includes("to") && filters.to) {
    fields.push({ name: "to", value: formatBusinessDate(filters.to) });
  }

  return fields;
}

export function FinanceDateFilter({ filters, basePath = "/admin/finance" }: FinanceDateFilterProps) {
  const customFrom = filters.from ? formatBusinessDate(filters.from) : "";
  const customTo = filters.to ? formatBusinessDate(filters.to) : "";

  return (
    <div className="space-y-4">
      <TabPills
        ariaLabel="Date range"
        items={FINANCE_DATE_PRESETS.map((item) => ({
          key: item.preset,
          label: item.label,
          active: filters.preset === item.preset,
          href: `${basePath}${buildFinanceQueryString({
            courseId: filters.courseId,
            studentId: filters.studentId,
            paymentType: filters.paymentType,
            category: filters.category,
            teacherId: filters.teacherId,
            tab: filters.tab,
            q: filters.q,
            preset: item.preset,
          })}`,
        }))}
      />

      <form
        method="get"
        action={basePath}
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
