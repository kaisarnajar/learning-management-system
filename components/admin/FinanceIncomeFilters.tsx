import {
  INCOME_PAYMENT_TYPES,
  incomePaymentTypeLabel,
} from "@/services/monthly-payment-status";
import type { FinanceFilters } from "@/services/finance-filters";
import { formatBusinessDate } from "@/services/business-time";
import { StudentSearchCombobox } from "@/components/admin/StudentSearchCombobox";

type StudentOption = { id: string; name: string | null; email: string };

type FinanceIncomeFiltersProps = {
  filters: FinanceFilters;
  courses: { id: string; title: string }[];
  /**
   * A short list (students with payments) shown as a select, or, when the
   * audience is every student, `{ search: selected }` for a search box.
   */
  students: StudentOption[] | { search: StudentOption | null };
  /** The page the filters submit to. */
  action?: string;
};

function preserveFields(filters: FinanceFilters) {
  const fields: { name: string; value: string }[] = [];

  if (filters.preset !== "this_month") {
    fields.push({ name: "preset", value: filters.preset });
  }
  if (filters.from) {
    fields.push({ name: "from", value: formatBusinessDate(filters.from) });
  }
  if (filters.to) {
    fields.push({ name: "to", value: formatBusinessDate(filters.to) });
  }
  if (filters.category) fields.push({ name: "category", value: filters.category });
  if (filters.teacherId) fields.push({ name: "teacherId", value: filters.teacherId });
  fields.push({ name: "tab", value: "income" });

  return fields;
}

export function FinanceIncomeFilters({ filters, courses, students, action = "/admin/finance" }: FinanceIncomeFiltersProps) {
  const fieldClassName = "mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm";
  return (
    <form
      method="get"
      action={action}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      {preserveFields(filters).map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}

      <div className="w-full sm:w-auto sm:min-w-[160px]">
        <label htmlFor="income-course" className="block text-xs font-medium text-muted">
          Course
        </label>
        <select
          id="income-course"
          name="courseId"
          defaultValue={filters.courseId ?? ""}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All courses</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      <div className="w-full sm:w-auto sm:min-w-ui-180">
        <label htmlFor="income-student" className="block text-xs font-medium text-muted">
          Student
        </label>
        {Array.isArray(students) ? (
          <select
            id="income-student"
            name="studentId"
            defaultValue={filters.studentId ?? ""}
            className={fieldClassName}
          >
            <option value="">All students</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name?.trim() || student.email}
              </option>
            ))}
          </select>
        ) : (
          <StudentSearchCombobox id="income-student" name="studentId" selected={students.search} className={fieldClassName} />
        )}
      </div>

      <div className="w-full sm:w-auto sm:min-w-[140px]">
        <label htmlFor="income-type" className="block text-xs font-medium text-muted">
          Payment type
        </label>
        <select
          id="income-type"
          name="paymentType"
          defaultValue={filters.paymentType ?? ""}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {INCOME_PAYMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {incomePaymentTypeLabel(type)}
            </option>
          ))}
        </select>
      </div>

      <button
        type="submit"
        className="min-h-11 w-full sm:w-auto rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
      >
        Apply filters
      </button>
    </form>
  );
}
