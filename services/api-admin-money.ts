import type { NextRequest } from "next/server";
import { getAllCourses } from "@/services/courses";
import { formatBusinessDate } from "@/services/business-time";
import { parseFinanceFilters, type FinanceFilters, type FinanceSearchParams } from "@/services/finance-filters";
import { incomePaymentTypeLabel } from "@/services/monthly-payment-status";
import { expenseCategoryLabel } from "@/services/expense-categories";
import { bookOrderStatusLabel, type BookOrderWithItems } from "@/services/bookstore";
import type { CoursePaymentSubmissionWithUser } from "@/services/monthly-payments";

/**
 * JSON shapes shared by the app's money endpoints (/api/v1/admin/payments,
 * completed-payments, finance, receipts, coupons). Each mirrors what the
 * matching admin table shows.
 */

/** Finance filters from the query string, read exactly as the finance pages read theirs. */
export function financeFiltersFromRequest(request: NextRequest, overrides: FinanceSearchParams = {}): FinanceFilters {
  const params: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return parseFinanceFilters({ ...params, ...overrides });
}

/** The date range a filter resolved to, for the app's date chip. */
export function financeRangeBody(filters: FinanceFilters) {
  return {
    preset: filters.preset,
    from: filters.from ? formatBusinessDate(filters.from) : null,
    to: filters.to ? formatBusinessDate(filters.to) : null,
  };
}

export async function courseTitleMap(): Promise<Map<string, string>> {
  const courses = await getAllCourses();
  return new Map(courses.map((c) => [c.id, c.title]));
}

/** A fee submission row (PaymentApprovalsTable). */
export function submissionRow(s: CoursePaymentSubmissionWithUser, titleById: Map<string, string>) {
  return {
    kind: "submission" as const,
    id: s.id,
    userId: s.userId,
    courseId: s.courseId,
    courseTitle: titleById.get(s.courseId) ?? s.courseId,
    paymentType: s.paymentType,
    label: s.label,
    amountInrPaise: s.amountInrPaise,
    status: s.status,
    paymentMethod: s.paymentMethod,
    reference: s.upiTransactionId,
    paymentReference: s.paymentReference,
    screenshotPath: s.paymentScreenshotPath,
    screenshotIsPdf: Boolean(s.paymentScreenshotPath?.toLowerCase().endsWith(".pdf")),
    paymentRecordId: s.paymentRecordId,
    receiptGeneratedAt: s.paymentRecord?.receiptGeneratedAt ?? null,
    createdAt: s.createdAt,
    submittedAt: s.updatedAt,
    user: s.user,
  };
}

/** A book order row (BookOrdersTable, payment_only mode). */
export function bookOrderRow(o: BookOrderWithItems) {
  return {
    kind: "book_order" as const,
    id: o.id,
    status: o.status,
    statusLabel: bookOrderStatusLabel(o.status),
    amountInrPaise: o.totalAmountInrPaise,
    paymentMethod: o.paymentMethod,
    reference: o.upiTransactionId,
    screenshotPath: o.paymentScreenshotPath,
    screenshotIsPdf: Boolean(o.paymentScreenshotPath?.toLowerCase().endsWith(".pdf")),
    deliveryAddress: o.deliveryAddress && o.deliveryAddress !== "No address provided" ? o.deliveryAddress : null,
    deliveryPinCode: o.deliveryPinCode,
    deliveryPhoneNumber: o.deliveryPhoneNumber,
    courierServiceName: o.courierServiceName,
    trackingId: o.trackingId,
    items: o.items.map((item) => ({
      id: item.id,
      title: item.book.title,
      quantity: item.quantity,
      lineTotalPaise: item.priceAtPurchaseInrPaise * item.quantity,
    })),
    paymentRecordId: o.paymentRecordId,
    receiptGeneratedAt: o.receiptGeneratedAt,
    canVoid: o.status === "DECLINED" || o.status === "REFUNDED",
    createdAt: o.createdAt,
    user: { id: o.userId, name: o.user.name, email: o.user.email },
  };
}

type IncomeRecordLike = {
  id: string;
  amountInrPaise: number;
  paidAt: Date;
  paymentType: string | null;
  description: string | null;
  receiptGeneratedAt?: Date | null;
  user: { id: string; name: string | null; email: string };
  course: { id: string; title: string } | null;
};

/** An income (payment record) row (FinanceIncomeTable / ManualTransactionsTable). */
export function incomeRow(r: IncomeRecordLike) {
  return {
    kind: "income" as const,
    id: r.id,
    amountInrPaise: r.amountInrPaise,
    paidAt: r.paidAt,
    paymentType: r.paymentType,
    paymentTypeLabel: incomePaymentTypeLabel(r.paymentType),
    description: r.description,
    paymentRecordId: r.id,
    receiptGeneratedAt: r.receiptGeneratedAt ?? null,
    courseId: r.course?.id ?? null,
    courseTitle: r.course?.title ?? null,
    user: r.user,
  };
}

type ExpenseLike = {
  id: string;
  category: string;
  amountInrPaise: number;
  paidAt: Date;
  description: string | null;
  note?: string | null;
  teacher: { id: string; name: string } | null;
};

/** An expense row (FinanceExpenseTable). */
export function expenseRow(e: ExpenseLike) {
  return {
    kind: "expense" as const,
    id: e.id,
    category: e.category,
    categoryLabel: expenseCategoryLabel(e.category),
    note: e.note ?? null,
    amountInrPaise: e.amountInrPaise,
    paidAt: e.paidAt,
    description: e.description,
    teacher: e.teacher,
  };
}
