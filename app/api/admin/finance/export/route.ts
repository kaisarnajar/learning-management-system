import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { FINANCE_EXPORT_MAX_ROWS, parseFinanceFilters } from "@/services/finance-filters";
import { getIncomeRecordsAll } from "@/services/finance-income";
import { getExpensesAll } from "@/services/finance-expenses";
import { getBookSalesAll, getBookOrderFinanceAll } from "@/services/finance-bookstore";
import { incomePaymentTypeLabel } from "@/services/monthly-payment-status";
import { expenseCategoryLabel } from "@/services/expense-categories";
import { bookOrderStatusLabel } from "@/services/bookstore";
import { formatBusinessDisplayDate } from "@/services/business-time";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return formatBusinessDisplayDate(date, { day: "numeric", month: "short", year: "numeric" });
}

class TooManyRows extends Error {}

/** Rows are read with take = cap + 1, so one extra row means the export is over the cap. */
function capped<T>(rows: T[]): T[] {
  if (rows.length > FINANCE_EXPORT_MAX_ROWS) throw new TooManyRows();
  return rows;
}

/**
 * One "Report" sheet: a header row from the first row's keys, then one row
 * per record (numbers stay numeric cells). An empty export is an empty sheet.
 */
async function buildWorkbook(rows: Record<string, unknown>[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Report");
  const headers = Object.keys(rows[0] ?? {});
  if (headers.length > 0) {
    sheet.addRow(headers);
    for (const row of rows) sheet.addRow(headers.map((h) => row[h] as ExcelJS.CellValue));
  }
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

export async function GET(request: Request) {
  const session = await auth();
  if (!isAdminSession(session)) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "income" | "expenses" | "book_sales" | "book_orders"

  const urlParams: Record<string, string> = {};
  searchParams.forEach((val, key) => {
    urlParams[key] = val;
  });

  const filters = parseFinanceFilters(urlParams);
  // The whole workbook is built in memory: an unbounded range would read
  // every row ever recorded in one request.
  if (!filters.from || !filters.to) {
    return NextResponse.json({ error: "Choose a date range to export; all-time exports are not available." }, { status: 400 });
  }
  const take = FINANCE_EXPORT_MAX_ROWS + 1;

  let sheetData: Record<string, unknown>[] = [];
  let filename = "export.xlsx";

  try {
    if (type === "income") {
      const records = capped(await getIncomeRecordsAll(filters, take));
      sheetData = records.map((r) => ({
        "Date": formatDate(r.paidAt),
        "Student Name": r.user.name?.trim() || "—",
        "Student Email": r.user.email,
        "Course Title": r.course?.title ?? "—",
        "Payment Type": incomePaymentTypeLabel(r.paymentType),
        "Amount (INR)": r.amountInrPaise / 100,
        "Description": r.description ?? "—",
      }));
      filename = `Course_Income_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (type === "expenses") {
      const records = capped(await getExpensesAll(filters, take));
      sheetData = records.map((r) => ({
        "Date": formatDate(r.paidAt),
        "Category": r.note ? `${expenseCategoryLabel(r.category)}: ${r.note}` : expenseCategoryLabel(r.category),
        "Teacher Name": r.teacher?.name ?? "—",
        "Amount (INR)": r.amountInrPaise / 100,
        "Description": r.description ?? "—",
      }));
      filename = `Course_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (type === "book_sales") {
      const records = capped(await getBookSalesAll(filters, take));
      sheetData = records.map((r) => ({
        "Book Title": r.title,
        "Author": r.author,
        "Purchase Price (INR)": r.purchasePriceInrPaise / 100,
        "Selling Price (INR)": r.sellingPriceInrPaise / 100,
        "Procured Qty": r.quantityPurchased,
        "Sold Qty": r.quantitySold,
        "Remaining Stock": r.remainingStock,
        "Revenue (INR)": r.revenuePaise / 100,
        "Profit (INR)": r.profitPaise / 100,
      }));
      filename = `Book_Sales_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (type === "book_orders") {
      const records = capped(await getBookOrderFinanceAll(filters, take));
      sheetData = records.map((r) => ({
        "Order ID": r.id.toUpperCase(),
        "Date": formatDate(r.orderDate),
        "Customer Name": r.customerName,
        "Customer Email": r.customerEmail,
        "Delivery Address": r.deliveryAddress,
        "Delivery Pincode": r.deliveryPinCode ?? "—",
        "Delivery Phone Number": r.deliveryPhoneNumber ?? "—",
        "Status": bookOrderStatusLabel(r.status),
        "Order Total (INR)": r.totalAmountPaise / 100,
        "Shipping (INR)": r.shippingChargePaise / 100,
        "Refunded (INR)": r.refundedAmountPaise / 100,
        "Net Income (INR)": (r.status === "APPROVED" || r.status === "SHIPPED" ? r.totalAmountPaise : 0) / 100,
        "Profit Contribution (INR)": r.profitContributionPaise / 100,
      }));
      filename = `Bookstore_Order_Finance_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else {
      return NextResponse.json({ error: "Invalid or missing export type." }, { status: 400 });
    }

    const buffer = await buildWorkbook(sheetData);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof TooManyRows) {
      return NextResponse.json(
        { error: `This export has more than ${FINANCE_EXPORT_MAX_ROWS.toLocaleString("en-IN")} rows. Choose a shorter date range.` },
        { status: 400 },
      );
    }
    console.error("Failed to export finance report:", error);
    return NextResponse.json({ error: "Failed to generate Excel export." }, { status: 500 });
  }
}
