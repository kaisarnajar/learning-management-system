import { NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { isAdminSession } from "@/services/admin";
import { parseFinanceFilters } from "@/services/finance-filters";
import { getIncomeRecordsAll } from "@/services/finance-income";
import { getExpensesAll } from "@/services/finance-expenses";
import { getBookSalesAll, getBookOrderFinanceAll } from "@/services/finance-bookstore";
import { incomePaymentTypeLabel } from "@/services/monthly-payment-status";
import { expenseCategoryLabel } from "@/services/expense-categories";
import { bookOrderStatusLabel } from "@/services/bookstore";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  let sheetData: Record<string, unknown>[] = [];
  let filename = "export.xlsx";

  try {
    if (type === "income") {
      const records = await getIncomeRecordsAll(filters);
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
      const records = await getExpensesAll(filters);
      sheetData = records.map((r) => ({
        "Date": formatDate(r.paidAt),
        "Category": expenseCategoryLabel(r.category),
        "Teacher Name": r.teacher?.name ?? "—",
        "Amount (INR)": r.amountInrPaise / 100,
        "Description": r.description ?? "—",
      }));
      filename = `Course_Expenses_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else if (type === "book_sales") {
      const records = await getBookSalesAll(filters.q);
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
      const records = await getBookOrderFinanceAll(filters);
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
        "Profit Contribution (INR)": r.profitContributionPaise / 100,
      }));
      filename = `Bookstore_Order_Finance_${new Date().toISOString().slice(0, 10)}.xlsx`;
    } else {
      return NextResponse.json({ error: "Invalid or missing export type." }, { status: 400 });
    }

    // Generate Excel Workbook
    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    // Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export finance report:", error);
    return NextResponse.json({ error: "Failed to generate Excel export." }, { status: 500 });
  }
}
