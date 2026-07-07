import {
  INCOME_PAYMENT_TYPES,
  type IncomePaymentType,
} from "@/services/monthly-payment-status";
import {
  isExpenseCategory,
  isTeacherExpenseFilterRelevant,
  type ExpenseCategory,
} from "@/services/expense-categories";
import { parseSearchQuery } from "@/utils/text-search";

export type FinanceTab = "income" | "expenses";



export type FinanceDatePreset = "this_month" | "last_month" | "this_year" | "all_time" | "custom";

export type FinanceDateRange = {
  from: Date | null;
  to: Date | null;
  preset: FinanceDatePreset;
};

export type FinanceIncomeFilters = {
  courseId?: string;
  studentId?: string;
  paymentType?: IncomePaymentType;
};

export type FinanceExpenseFilters = {
  category?: ExpenseCategory;
  teacherId?: string;
};

export type FinanceFilters = FinanceDateRange & FinanceIncomeFilters & FinanceExpenseFilters & {
  tab: FinanceTab;
  q?: string;
  onlyManual?: boolean;
};

export type FinanceSearchParams = {
  tab?: string;
  preset?: string;
  from?: string;
  to?: string;
  courseId?: string;
  studentId?: string;
  paymentType?: string;
  category?: string;
  teacherId?: string;
  q?: string;
  page?: string;
  saved?: string;
  deleted?: string;
  error?: string;
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDateParam(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

type DatePresetBounds = {
  thisMonthStart: Date;
  thisMonthEnd: Date;
  lastMonthStart: Date;
  lastMonthEnd: Date;
  thisYearStart: Date;
  thisYearEnd: Date;
};

function getDatePresetBounds(now: Date): DatePresetBounds {
  const year = now.getFullYear();
  const month = now.getMonth();

  return {
    thisMonthStart: startOfDay(new Date(year, month, 1)),
    thisMonthEnd: endOfDay(new Date(year, month + 1, 0)),
    lastMonthStart: startOfDay(new Date(year, month - 1, 1)),
    lastMonthEnd: endOfDay(new Date(year, month, 0)),
    thisYearStart: startOfDay(new Date(year, 0, 1)),
    thisYearEnd: endOfDay(new Date(year, 11, 31)),
  };
}

export function parseFinanceFilters(params: FinanceSearchParams, now = new Date()): FinanceFilters {
  const bounds = getDatePresetBounds(now);
  const presetParam = params.preset;

  let preset: FinanceDatePreset = "this_month";
  let from: Date | null = bounds.thisMonthStart;
  let to: Date | null = bounds.thisMonthEnd;

  if (presetParam === "last_month") {
    preset = "last_month";
    from = bounds.lastMonthStart;
    to = bounds.lastMonthEnd;
  } else if (presetParam === "this_year") {
    preset = "this_year";
    from = bounds.thisYearStart;
    to = bounds.thisYearEnd;
  } else if (presetParam === "all_time") {
    preset = "all_time";
    from = null;
    to = null;
  } else if (presetParam === "custom" || params.from || params.to) {
    preset = "custom";
    from = parseDateParam(params.from);
    to = null;
    if (params.to?.trim()) {
      const parsedTo = new Date(params.to);
      if (!Number.isNaN(parsedTo.getTime())) {
        to = endOfDay(parsedTo);
      }
    }
  }

  const paymentType = (INCOME_PAYMENT_TYPES as readonly string[]).includes(params.paymentType ?? "")
    ? (params.paymentType as IncomePaymentType)
    : undefined;

  const category =
    params.category && isExpenseCategory(params.category) ? params.category : undefined;

  const tab: FinanceTab = params.tab === "expenses" ? "expenses" : "income";

  return {
    preset,
    from,
    to,
    tab,
    courseId: params.courseId?.trim() || undefined,
    studentId: params.studentId?.trim() || undefined,
    paymentType,
    category,
    teacherId: isTeacherExpenseFilterRelevant(category)
      ? params.teacherId?.trim() || undefined
      : undefined,
    q: parseSearchQuery(params.q),
  };
}

export function buildFinanceQueryString(
  filters: Partial<FinanceFilters> & { preset?: FinanceDatePreset },
  overrides: Partial<FinanceFilters & { saved?: string; deleted?: string; tab?: FinanceTab }> = {},
): string {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();

  const tab = merged.tab ?? "income";
  if (tab === "expenses") {
    params.set("tab", "expenses");
  }

  if (merged.preset === "custom") {
    params.set("preset", "custom");
  } else if (merged.preset && merged.preset !== "this_month") {
    params.set("preset", merged.preset);
  }

  if (merged.from) {
    params.set("from", merged.from.toISOString().slice(0, 10));
  }
  if (merged.to) {
    params.set("to", merged.to.toISOString().slice(0, 10));
  }
  if (merged.courseId) params.set("courseId", merged.courseId);
  if (merged.studentId) params.set("studentId", merged.studentId);
  if (merged.paymentType) params.set("paymentType", merged.paymentType);
  if (merged.category) params.set("category", merged.category);
  if (
    isTeacherExpenseFilterRelevant(merged.category as ExpenseCategory | undefined) &&
    merged.teacherId
  ) {
    params.set("teacherId", merged.teacherId);
  }
  if (merged.q) params.set("q", merged.q);
  if ("saved" in overrides && overrides.saved) params.set("saved", overrides.saved);
  if ("deleted" in overrides && overrides.deleted) params.set("deleted", overrides.deleted);

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function financePaidAtWhere(filters: Pick<FinanceFilters, "from" | "to">) {
  if (!filters.from && !filters.to) return undefined;

  const paidAt: { gte?: Date; lte?: Date } = {};
  if (filters.from) paidAt.gte = filters.from;
  if (filters.to) paidAt.lte = filters.to;

  return paidAt;
}

/** Query params to preserve when submitting finance search (excludes q and page). */
export function buildFinanceSearchPreserveParams(
  filters: FinanceFilters,
): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};

  if (filters.tab === "expenses") params.tab = "expenses";
  if (filters.preset !== "this_month") params.preset = filters.preset;
  if (filters.from) params.from = filters.from.toISOString().slice(0, 10);
  if (filters.to) params.to = filters.to.toISOString().slice(0, 10);
  if (filters.courseId) params.courseId = filters.courseId;
  if (filters.studentId) params.studentId = filters.studentId;
  if (filters.paymentType) params.paymentType = filters.paymentType;
  if (filters.category) params.category = filters.category;
  if (filters.teacherId) params.teacherId = filters.teacherId;

  return params;
}

export const FINANCE_DATE_PRESETS: { label: string; preset: FinanceDatePreset }[] = [
  { label: "This month", preset: "this_month" },
  { label: "Last month", preset: "last_month" },
  { label: "This year", preset: "this_year" },
  { label: "All time", preset: "all_time" },
];
