import { NextRequest } from "next/server";
import { notFound } from "next/navigation";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { bookOrderAuditActionLabel, getBookOrderDetail } from "@/services/book-order-detail";
import { bookOrderStatusLabel } from "@/services/bookstore";

type Params = { params: Promise<{ id: string }> };

/** One order as on /admin/bookstore/orders/[id]: customer and delivery, payment and shipment, items, timeline. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/bookstore/orders/[id]", async () => {
    const detail = await getBookOrderDetail(id);
    if (!detail) notFound();
    const { order, timeline } = detail;
    const subtotalInrPaise = order.items.reduce((sum, item) => sum + item.priceAtPurchaseInrPaise * item.quantity, 0);
    return {
      order: {
        id: order.id,
        shortId: order.id.slice(-8).toUpperCase(),
        status: order.status,
        statusLabel: bookOrderStatusLabel(order.status),
        deleted: order.deletedAt != null,
        deletedAt: order.deletedAt,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customer: { id: order.user.id, name: order.user.name, email: order.user.email },
        deliveryAddress: order.deliveryAddress,
        deliveryPinCode: order.deliveryPinCode,
        deliveryPhoneNumber: order.deliveryPhoneNumber,
        notes: order.notes,
        paymentMethod: order.paymentMethod,
        upiTransactionId: order.upiTransactionId,
        paymentScreenshotPath: order.paymentScreenshotPath,
        courierServiceName: order.courierServiceName,
        trackingId: order.trackingId,
        items: order.items.map((item) => ({
          id: item.id,
          bookId: item.book.id,
          title: item.book.title,
          author: item.book.author,
          quantity: item.quantity,
          priceAtPurchaseInrPaise: item.priceAtPurchaseInrPaise,
          lineTotalInrPaise: item.priceAtPurchaseInrPaise * item.quantity,
        })),
        subtotalInrPaise,
        shippingChargeInrPaise: order.shippingChargeInrPaise,
        totalAmountInrPaise: order.totalAmountInrPaise,
      },
      timeline: timeline.map((entry) => ({
        id: entry.id,
        action: entry.action,
        label: bookOrderAuditActionLabel(entry.action),
        actorEmail: entry.actorEmail,
        reason: entry.reason,
        createdAt: entry.createdAt,
      })),
    };
  });
}
