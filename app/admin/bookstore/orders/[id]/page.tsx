import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ScreenshotPreview } from "@/components/admin/BookOrdersTable";
import { requireAdmin } from "@/services/auth-actions";
import { getBookOrderDetail } from "@/services/book-order-detail";
import { bookOrderStatusClass, bookOrderStatusLabel } from "@/services/bookstore";
import { formatPrice } from "@/services/courses";

export const metadata: Metadata = { title: "Book order — Admin" };

const dateTimeFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const AUDIT_ACTION_LABELS: Record<string, string> = {
  approve: "Approved",
  decline: "Declined",
  ship: "Marked as shipped",
  refund: "Marked as refunded",
  void: "Voided",
  delete: "Deleted",
  soft_delete: "Deleted",
  restore: "Restored",
  update: "Updated",
  create: "Created",
};

export default async function AdminBookOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const detail = await getBookOrderDetail(id);

  if (!detail) notFound();

  const { order, timeline } = detail;
  const subtotalPaise = order.items.reduce(
    (sum, item) => sum + item.priceAtPurchaseInrPaise * item.quantity,
    0,
  );

  return (
    <div>
      <Link href="/admin/bookstore/orders" className="text-sm text-primary hover:underline">
        ← Back to book orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-bold text-primary">
          Order {order.id.slice(-8).toUpperCase()}
        </h1>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bookOrderStatusClass(order.status)}`}
        >
          {bookOrderStatusLabel(order.status)}
        </span>
        {order.deletedAt && (
          <span className="inline-flex items-center rounded-full bg-destructive-bg px-2.5 py-0.5 text-xs font-medium text-destructive-text">
            Deleted
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">Placed {dateTimeFormat.format(order.createdAt)}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card-elevated p-5" aria-labelledby="order-customer">
          <h2 id="order-customer" className="font-serif text-lg font-semibold text-foreground">
            Customer &amp; delivery
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-foreground">Name</dt>
              <dd className="text-muted">{order.user.name ?? "—"}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-foreground">Email</dt>
              <dd className="break-all text-muted">{order.user.email}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-foreground">Phone</dt>
              <dd className="text-muted">{order.deliveryPhoneNumber ?? "—"}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-foreground">Address</dt>
              <dd className="whitespace-pre-line text-muted">
                {order.deliveryAddress}
                {order.deliveryPinCode ? ` — ${order.deliveryPinCode}` : ""}
              </dd>
            </div>
            {order.notes && (
              <div className="flex gap-4">
                <dt className="w-28 shrink-0 font-medium text-foreground">Notes</dt>
                <dd className="whitespace-pre-line text-muted">{order.notes}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="card-elevated p-5" aria-labelledby="order-payment">
          <h2 id="order-payment" className="font-serif text-lg font-semibold text-foreground">
            Payment &amp; shipment
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-foreground">Method</dt>
              <dd className="capitalize text-muted">{order.paymentMethod ?? "—"}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-foreground">UTR / reference</dt>
              <dd className="break-all font-mono text-xs text-muted">{order.upiTransactionId ?? "—"}</dd>
            </div>
            <div className="flex gap-4">
              <dt className="w-28 shrink-0 font-medium text-foreground">Proof</dt>
              <dd>
                {order.paymentScreenshotPath ? (
                  <ScreenshotPreview path={order.paymentScreenshotPath} />
                ) : (
                  <span className="text-muted">No screenshot uploaded</span>
                )}
              </dd>
            </div>
            {order.courierServiceName && (
              <>
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 font-medium text-foreground">Courier</dt>
                  <dd className="text-muted">{order.courierServiceName}</dd>
                </div>
                <div className="flex gap-4">
                  <dt className="w-28 shrink-0 font-medium text-foreground">Tracking ID</dt>
                  <dd className="break-all text-muted">{order.trackingId ?? "—"}</dd>
                </div>
              </>
            )}
          </dl>
        </section>
      </div>

      <section className="mt-6" aria-labelledby="order-items">
        <h2 id="order-items" className="font-serif text-lg font-semibold text-foreground">
          Items
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-ui-640 text-left text-sm">
            <thead className="border-b border-border bg-background/50 text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Book</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{item.book.title}</div>
                    <div className="text-xs text-muted">{item.book.author}</div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted">{formatPrice(item.priceAtPurchaseInrPaise)}</td>
                  <td className="px-4 py-3 text-right text-muted">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatPrice(item.priceAtPurchaseInrPaise * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border text-sm">
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-muted">Subtotal</td>
                <td className="px-4 py-2 text-right text-foreground">{formatPrice(subtotalPaise)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-muted">Shipping</td>
                <td className="px-4 py-2 text-right text-foreground">{formatPrice(order.shippingChargeInrPaise)}</td>
              </tr>
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right font-semibold text-foreground">Total</td>
                <td className="px-4 py-2 text-right font-semibold text-foreground">
                  {formatPrice(order.totalAmountInrPaise)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="mt-8" aria-labelledby="order-timeline">
        <h2 id="order-timeline" className="font-serif text-lg font-semibold text-foreground">
          Timeline
        </h2>
        <ol className="mt-3 space-y-3 border-l border-border pl-5 text-sm">
          <li>
            <p className="font-medium text-foreground">Order placed</p>
            <p className="text-xs text-muted">{dateTimeFormat.format(order.createdAt)}</p>
          </li>
          {timeline.map((entry) => (
            <li key={entry.id}>
              <p className="font-medium text-foreground">
                {AUDIT_ACTION_LABELS[entry.action] ?? entry.action}
                {entry.actorEmail ? <span className="font-normal text-muted"> by {entry.actorEmail}</span> : null}
              </p>
              {entry.reason && <p className="text-xs text-muted">Reason: {entry.reason}</p>}
              <p className="text-xs text-muted">{dateTimeFormat.format(entry.createdAt)}</p>
            </li>
          ))}
        </ol>
        {timeline.length === 0 && (
          <p className="mt-3 text-xs text-muted">
            No admin actions recorded for this order yet. Status changes made before the audit log was introduced are not listed.
          </p>
        )}
      </section>
    </div>
  );
}
