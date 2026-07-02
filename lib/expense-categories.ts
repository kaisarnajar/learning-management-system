export const EXPENSE_CATEGORY_TEACHER_SALARY = "teacher_salary" as const;
export const EXPENSE_CATEGORY_WEBSITE_HOSTING = "website_hosting" as const;
export const EXPENSE_CATEGORY_MARKETING = "marketing" as const;
export const EXPENSE_CATEGORY_SOFTWARE_TOOLS = "software_tools" as const;
export const EXPENSE_CATEGORY_OFFICE_MISC = "office_misc" as const;
export const EXPENSE_CATEGORY_OTHER = "other" as const;

export const EXPENSE_CATEGORIES = [
  EXPENSE_CATEGORY_TEACHER_SALARY,
  EXPENSE_CATEGORY_WEBSITE_HOSTING,
  EXPENSE_CATEGORY_MARKETING,
  EXPENSE_CATEGORY_SOFTWARE_TOOLS,
  EXPENSE_CATEGORY_OFFICE_MISC,
  EXPENSE_CATEGORY_OTHER,
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [EXPENSE_CATEGORY_TEACHER_SALARY]: "Teacher salary",
  [EXPENSE_CATEGORY_WEBSITE_HOSTING]: "Website & hosting",
  [EXPENSE_CATEGORY_MARKETING]: "Marketing",
  [EXPENSE_CATEGORY_SOFTWARE_TOOLS]: "Software & tools",
  [EXPENSE_CATEGORY_OFFICE_MISC]: "Office & misc",
  [EXPENSE_CATEGORY_OTHER]: "Other",
};

export function expenseCategoryLabel(category: string): string {
  return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] ?? category.replace(/_/g, " ");
}

export function isExpenseCategory(value: string): value is ExpenseCategory {
  return (EXPENSE_CATEGORIES as readonly string[]).includes(value);
}

export function isTeacherExpenseFilterRelevant(category: string | undefined): boolean {
  return category === EXPENSE_CATEGORY_TEACHER_SALARY;
}

export const EXPENSE_CATEGORY_OPTIONS = EXPENSE_CATEGORIES.map((category) => ({
  value: category,
  label: expenseCategoryLabel(category),
}));
