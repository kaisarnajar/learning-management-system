import { NextRequest } from "next/server";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { getAllCourses } from "@/services/courses";
import { EXPENSE_CATEGORY_OPTIONS } from "@/services/expense-categories";
import { formatBusinessDate } from "@/services/business-time";
import { FINANCE_DATE_PRESETS } from "@/services/finance-filters";
import { INCOME_PAYMENT_TYPES, incomePaymentTypeLabel } from "@/services/monthly-payment-status";
import { getStudentsWithPayments, getStudentUsers } from "@/services/students";
import { getAllTeachers } from "@/services/teachers";

/** The record-payment form's Type choices (RecordPaymentForm). */
const RECORD_PAYMENT_TYPES = [
  { value: "monthly", label: "Monthly Fee" },
  { value: "quarterly", label: "Quarterly Fee" },
  { value: "half_yearly", label: "Half Yearly Fee" },
  { value: "yearly", label: "Yearly Fee" },
  { value: "enrollment", label: "Enrollment Fee" },
  { value: "manual", label: "Other" },
];

/**
 * Choices for the finance filters and the record-payment / record-expense
 * forms: courses, students (`students=all` for every student, as the
 * fee-waiver finance filter uses; default: students with payments, as
 * /admin/finance), teachers, expense categories, income payment types,
 * date presets and today's business date.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/finance/options", async () => {
    const allStudents = request.nextUrl.searchParams.get("students") === "all";
    const [courses, students, teachers] = await Promise.all([
      getAllCourses(),
      allStudents ? getStudentUsers() : getStudentsWithPayments(),
      getAllTeachers(),
    ]);
    return {
      courses: courses.map((c) => ({ id: c.id, title: c.title })),
      students: students.map((s) => ({ id: s.id, name: s.name, email: s.email })),
      teachers: teachers.map((t) => ({ id: t.id, name: t.name })),
      expenseCategories: EXPENSE_CATEGORY_OPTIONS,
      incomePaymentTypes: INCOME_PAYMENT_TYPES.map((value) => ({ value, label: incomePaymentTypeLabel(value) })),
      recordPaymentTypes: RECORD_PAYMENT_TYPES,
      datePresets: FINANCE_DATE_PRESETS.map((p) => ({ value: p.preset, label: p.label })),
      today: formatBusinessDate(new Date()),
    };
  });
}
