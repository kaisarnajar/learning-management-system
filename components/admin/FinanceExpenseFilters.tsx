"use client";

import { useState } from "react";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_TEACHER_SALARY,
  expenseCategoryLabel,
} from "@/lib/expense-categories";
import type { FinanceFilters } from "@/lib/finance-filters";

type FinanceExpenseFiltersProps = {
  filters: FinanceFilters;
  teachers: { id: string; name: string }[];
};

function preserveFields(filters: FinanceFilters) {
  const fields: { name: string; value: string }[] = [];

  if (filters.preset !== "this_month") {
    fields.push({ name: "preset", value: filters.preset });
  }
  if (filters.from) {
    fields.push({ name: "from", value: filters.from.toISOString().slice(0, 10) });
  }
  if (filters.to) {
    fields.push({ name: "to", value: filters.to.toISOString().slice(0, 10) });
  }
  if (filters.courseId) fields.push({ name: "courseId", value: filters.courseId });
  if (filters.studentId) fields.push({ name: "studentId", value: filters.studentId });
  if (filters.paymentType) fields.push({ name: "paymentType", value: filters.paymentType });
  fields.push({ name: "tab", value: "expenses" });

  return fields;
}

export function FinanceExpenseFilters({ filters, teachers }: FinanceExpenseFiltersProps) {
  const [category, setCategory] = useState(filters.category ?? "");
  const showTeacherFilter = category === EXPENSE_CATEGORY_TEACHER_SALARY;

  return (
    <form
      method="get"
      action="/admin/finance"
      className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
    >
      {preserveFields(filters).map((field) => (
        <input key={field.name} type="hidden" name={field.name} value={field.value} />
      ))}

      <div className="w-full sm:w-auto sm:min-w-ui-180">
        <label htmlFor="expense-category" className="block text-xs font-medium text-muted">
          Category
        </label>
        <select
          id="expense-category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {EXPENSE_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {expenseCategoryLabel(item)}
            </option>
          ))}
        </select>
      </div>

      {showTeacherFilter && (
        <div className="w-full sm:w-auto sm:min-w-ui-180">
          <label htmlFor="expense-teacher" className="block text-xs font-medium text-muted">
            Teacher
          </label>
          <select
            id="expense-teacher"
            name="teacherId"
            defaultValue={filters.teacherId ?? ""}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All teachers</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        className="min-h-11 w-full sm:w-auto rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-light"
      >
        Apply filters
      </button>
    </form>
  );
}
