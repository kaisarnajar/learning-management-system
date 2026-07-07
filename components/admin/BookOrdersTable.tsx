"use client";

import Image from "next/image";
import { useState } from "react";
import type { BookOrderWithItems } from "@/services/bookstore";
import { approveBookOrder, declineBookOrder, markBookOrderShipped, markBookOrderRefunded, deleteBookOrder } from "@/app/admin/bookstore/orders/actions";
import { bookOrderStatusLabel, bookOrderStatusClass } from "@/services/bookstore";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { useToast } from "@/components/shared/ToastProvider";
import { ReceiptActionButtons } from "@/components/payment/ReceiptActionButtons";
import { DeleteActionButton } from "@/components/shared/DeleteActionButton";

import { adminActionButtonClassName, adminDestructiveButtonClassName } from "@/utils/form";

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


export function MarkShippedModal({ orderId }: { orderId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const { addToast } = useToast();

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courier.trim() || !tracking.trim()) {
      addToast("Both Courier Service Name and Tracking ID are required.", "error");
      return;
    }
    
    setIsPending(true);
    try {
      const result = await markBookOrderShipped(
        orderId, 
        courier, 
        tracking, 
        window.location.pathname + window.location.search
      );
      if (result?.error) {
        addToast(result.error, "error");
      } else {
        setIsOpen(false);
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button 
        type="button" 
        onClick={() => setIsOpen(true)}
        className={adminActionButtonClassName}
      >
        Mark as Shipped
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !isPending && setIsOpen(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-surface p-6 shadow-xl border border-border">
            <h3 className="text-lg font-semibold text-foreground">Mark as Shipped</h3>
            <p className="mt-2 text-sm text-muted">Enter shipment details to notify the student.</p>
            
            <form onSubmit={handleConfirm} className="mt-4 space-y-4">
              <div>
                <label htmlFor="courier" className="block text-sm font-medium text-foreground">
                  Courier Service Name <span className="text-destructive-text">*</span>
                </label>
                <input
                  id="courier"
                  type="text"
                  required
                  value={courier}
                  onChange={(e) => setCourier(e.target.value)}
                  disabled={isPending}
                  className="mt-1 block w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  placeholder="e.g. DTDC, India Post"
                />
              </div>
              <div>
                <label htmlFor="tracking" className="block text-sm font-medium text-foreground">
                  Tracking ID <span className="text-destructive-text">*</span>
                </label>
                <input
                  id="tracking"
                  type="text"
                  required
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  disabled={isPending}
                  className="mt-1 block w-full rounded-md border border-input-border bg-input-bg px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                  placeholder="e.g. 1Z9999999999999999"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted rounded-md transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !courier.trim() || !tracking.trim()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light transition-colors disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Confirm Shipment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
function OrderActions({ order, mode }: { order: BookOrderWithItems; mode: "default" | "payment_only" }) {
  const { addToast } = useToast();
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
                 const result = await approveBookOrder(order.id, window.location.pathname + window.location.search);
                 if (result?.error) addToast(result.error, "error");
               }}
               trigger={
                  <button type="button" className={adminActionButtonClassName}>Approve</button>
               }
            />
            <ConfirmationModal
               title="Decline Order"
               description="Are you sure you want to decline this order?"
               actionLabel="Decline"
               variant="destructive"
               onConfirm={async () => {
                 const result = await declineBookOrder(order.id, window.location.pathname + window.location.search);
                 if (result?.error) addToast(result.error, "error");
               }}
               trigger={
                  <button type="button" className={adminDestructiveButtonClassName}>Decline</button>
               }
            />
          </div>
        </td>
     );
  }
  if (mode === "payment_only") {
    return (
      <td className="whitespace-nowrap px-4 py-4 align-top">
        <div className="flex items-center justify-end gap-2">
          {order.paymentRecordId ? (
            <ReceiptActionButtons
              paymentRecordId={order.paymentRecordId}
              receiptGeneratedAt={order.receiptGeneratedAt}
              isAdmin={true}
            />
          ) : (
             <span className="text-xs italic text-muted">No Payment Record</span>
          )}
          <DeleteActionButton
            action={async () => {
              const result = await deleteBookOrder(order.id);
              if (result?.error) addToast(result.error, "error");
            }}
            itemName="payment"
          />
        </div>
      </td>
    );
  }

  if (order.status === "APPROVED") {
     return (
        <td className="whitespace-nowrap px-4 py-4 align-top">
          <div className="flex items-center justify-end gap-2">
            <MarkShippedModal orderId={order.id} />
            <ConfirmationModal
               title="Refund Order"
               description="Are you sure you want to refund this order? The student will be notified."
               actionLabel="Refund"
               onConfirm={async () => {
                 const result = await markBookOrderRefunded(order.id, window.location.pathname + window.location.search);
                 if (result?.error) addToast(result.error, "error");
               }}
               trigger={
                  <button type="button" className={adminDestructiveButtonClassName}>Refund</button>
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
             if (result?.error) addToast(result.error, "error");
           }}
           trigger={
              <button type="button" className={adminDestructiveButtonClassName}>
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
  mode = "default",
}: {
  order: BookOrderWithItems;
  mode?: "default" | "payment_only";
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
      <td className="px-4 py-4 align-top max-w-ui-200">
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
      
      {order.status === "SHIPPED" && order.courierServiceName && (
        <div className="mt-3 border-t border-border pt-2">
          <p className="text-xs font-medium text-foreground">Shipment Details</p>
          <p className="text-xs text-muted">Courier: {order.courierServiceName}</p>
          <p className="text-xs text-muted">Tracking ID: {order.trackingId}</p>
        </div>
      )}
      </td>
      <OrderActions order={order} mode={mode} />
    </tr>
  );
}

export function BookOrdersTable({
  orders,
  emptyMessage,
  showStatusColumn = false,
  mode = "default",
}: {
  orders: BookOrderWithItems[];
  emptyMessage: string;
  showStatusColumn?: boolean;
  mode?: "default" | "payment_only";
}) {
  if (orders.length === 0) {
    return <p className="px-4 py-8 text-center text-sm text-muted">{emptyMessage}</p>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-ui-800 text-left text-sm">
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
              mode={mode}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
