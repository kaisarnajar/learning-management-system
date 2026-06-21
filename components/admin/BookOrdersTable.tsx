"use client";

import Image from "next/image";
import { useState } from "react";
import type { BookOrderWithItems } from "@/lib/bookstore";
import { approveBookOrder, declineBookOrder, markBookOrderShipped, markBookOrderRefunded, deleteBookOrder } from "@/app/admin/bookstore/orders/actions";
import { bookOrderStatusLabel, bookOrderStatusClass } from "@/lib/bookstore";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";

export function formatPrice(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function ScreenshotPreview({ path }: { path: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-primary underline hover:text-primary-light"
      >
        View screenshot
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal
          aria-label="Payment screenshot"
        >
          <div className="relative max-h-[90vh] max-w-lg overflow-auto rounded-xl bg-surface p-2 shadow-2xl">
            <Image
              src={path}
              alt="Payment screenshot"
              width={600}
              height={800}
              className="rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

function OrderActions({ order }: { order: BookOrderWithItems }) {
  if (order.status === "PENDING_VERIFICATION") {
     return (
        <td className="whitespace-nowrap px-4 py-4 align-top">
          <div className="flex items-center justify-end gap-2">
            <ConfirmationModal
               title="Approve Order"
               description="Approve this book order and notify the student?"
               actionLabel="Approve"
               variant="primary"
               onConfirm={async () => {
                 const result = await approveBookOrder(order.id);
                 if (result?.error) window.alert(result.error);
               }}
               trigger={
                  <button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>
               }
            />
            <ConfirmationModal
               title="Decline Order"
               description="Are you sure you want to decline this order?"
               actionLabel="Decline"
               variant="destructive"
               onConfirm={async () => {
                 const result = await declineBookOrder(order.id);
                 if (result?.error) window.alert(result.error);
               }}
               trigger={
                  <button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Decline</button>
               }
            />
          </div>
        </td>
     );
  }
  
  if (order.status === "APPROVED") {
     return (
        <td className="whitespace-nowrap px-4 py-4 align-top">
          <div className="flex items-center justify-end gap-2">
            <ConfirmationModal
               title="Mark as Shipped"
               description="Mark this book order as shipped and notify the student?"
               actionLabel="Mark as Shipped"
               variant="primary"
               onConfirm={async () => {
                 const result = await markBookOrderShipped(order.id);
                 if (result?.error) window.alert(result.error);
               }}
               trigger={
                  <button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light transition-colors">Mark as Shipped</button>
               }
            />
            <ConfirmationModal
               title="Refund Order"
               description="Are you sure you want to refund this order? The student will be notified."
               actionLabel="Refund"
               onConfirm={async () => {
                 const result = await markBookOrderRefunded(order.id);
                 if (result?.error) window.alert(result.error);
               }}
               trigger={
                  <button type="button" className="rounded-md border border-border bg-surface-muted px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-muted-hover transition-colors">Refund</button>
               }
            />
          </div>
        </td>
     );
  }
  
  return (
    <td className="whitespace-nowrap px-4 py-4 align-top text-right">
      <div className="flex items-center justify-end gap-3">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${bookOrderStatusClass(order.status)}`}>
          {bookOrderStatusLabel(order.status)}
        </span>
        <ConfirmationModal
           title="Delete Order"
           description="Are you sure you want to permanently delete this transaction? This action cannot be undone."
           actionLabel="Delete"
           variant="destructive"
           onConfirm={async () => {
             const result = await deleteBookOrder(order.id);
             if (result?.error) window.alert(result.error);
           }}
           trigger={
              <button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">
                 Delete
              </button>
           }
        />
      </div>
    </td>
  );
}

export function BaseOrderRow({
  order,
}: {
  order: BookOrderWithItems;
}) {
  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-4 align-top">
        <p className="font-medium text-foreground">{order.user.name ?? "—"}</p>
        <p className="mt-0.5 text-xs text-muted">{order.user.email}</p>
        <p className="mt-0.5 text-xs text-muted">
          {order.createdAt.toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </td>
      <td className="px-4 py-4 align-top max-w-[200px]">
        {order.deliveryAddress && order.deliveryAddress !== "No address provided" ? (
          <div className="space-y-1">
            <p className="whitespace-pre-wrap text-sm text-muted">{order.deliveryAddress}</p>
            {order.deliveryPinCode && (
              <p className="text-sm text-muted"><span className="font-medium text-foreground">PIN:</span> {order.deliveryPinCode}</p>
            )}
            {order.deliveryPhoneNumber && (
              <p className="text-sm text-muted"><span className="font-medium text-foreground">Phone:</span> {order.deliveryPhoneNumber}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted italic">No address provided</p>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        <ul className="space-y-1">
          {order.items.map((item) => (
            <li key={item.id} className="text-sm text-foreground">
              {item.book.title}{" "}
              <span className="text-muted">
                × {item.quantity} — {formatPrice(item.priceAtPurchaseInrPaise * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
      </td>
      <td className="px-4 py-4 align-top">
        <p className="font-semibold text-foreground">{formatPrice(order.totalAmountInrPaise)}</p>
      </td>
      <td className="px-4 py-4 align-top text-sm">
        <p className="text-muted capitalize">{order.paymentMethod ?? "—"}</p>
        {order.upiTransactionId && (
          <p className="mt-0.5 break-all font-mono text-xs text-muted">{order.upiTransactionId}</p>
        )}
        {order.paymentScreenshotPath && (
          <div className="mt-1">
            <ScreenshotPreview path={order.paymentScreenshotPath} />
          </div>
        )}
      </td>
      <OrderActions order={order} />
    </tr>
  );
}

export function BookOrdersTable({
  orders,
  emptyMessage,
  showStatusColumn = false,
}: {
  orders: BookOrderWithItems[];
  emptyMessage: string;
  showStatusColumn?: boolean;
}) {
  if (orders.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[800px] text-left text-sm">
        <thead className="border-b border-border bg-background/50 text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Student</th>
            <th className="px-4 py-3 font-medium">Delivery Address</th>
            <th className="px-4 py-3 font-medium">Books</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className={`px-4 py-3 font-medium ${showStatusColumn ? 'text-right' : ''}`}>
              {showStatusColumn ? 'Status' : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <BaseOrderRow
              key={order.id}
              order={order}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
