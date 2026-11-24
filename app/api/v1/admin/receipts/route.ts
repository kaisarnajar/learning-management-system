import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { getGeneratedReceiptsPaginated } from "@/services/receipts-admin";

/** Generated payment receipts, as on /admin/receipts (newest first; voided records left out). */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/receipts", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const { items, totalCount } = await getGeneratedReceiptsPaginated(page, pageSize, q || undefined);
    return pagedBody(
      items.map((r) => ({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        receiptGeneratedAt: r.receiptGeneratedAt,
        paymentType: r.paymentType,
        paymentTypeLabel: r.paymentType?.replace(/_/g, " ") || "N/A",
        amountInrPaise: r.amountInrPaise,
        receiptIncludesGst: Boolean(r.receiptIncludesGst),
        receiptFeeAmountPaise: r.receiptFeeAmountPaise,
        receiptGstAmountPaise: r.receiptGstAmountPaise,
        user: r.user,
        courseTitle: r.course?.title ?? null,
      })),
      totalCount,
      page,
      pageSize,
    );
  });
}
