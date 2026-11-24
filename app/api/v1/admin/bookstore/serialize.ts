import type { BookOrderWithItems, BookWithDetails } from "@/services/bookstore";
import { bookOrderStatusLabel, bookStatusLabel, HOMEPAGE_FEATURED_BOOKS_MAX } from "@/services/bookstore";

/** The availability choices of the book form, in the website's order. */
export const BOOK_STATUS_OPTIONS = (["AVAILABLE", "OUT_OF_STOCK", "COMING_SOON"] as const).map((value) => ({
  value,
  label: bookStatusLabel(value),
}));

/** One book with every field the admin list, detail and edit form show. */
export function serializeBook(book: BookWithDetails) {
  const weightInGrams = "weightInGrams" in book ? (book as { weightInGrams: number }).weightInGrams : 0;
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    description: book.description,
    priceInrPaise: book.priceInrPaise,
    mrpInrPaise: book.mrpInrPaise,
    purchasePriceInrPaise: book.purchasePriceInrPaise,
    inventoryPurchased: book.inventoryPurchased,
    weightInGrams,
    status: book.status,
    statusLabel: bookStatusLabel(book.status),
    imagePath: book.imagePath,
    published: book.published,
    featuredOnHomepage: book.featuredOnHomepage,
    /** What the list's "Homepage" column says: only a published book is really featured. */
    featured: book.featuredOnHomepage && book.published,
    createdAt: book.createdAt,
    updatedAt: book.updatedAt,
  };
}

/** What the book form needs to explain the homepage slots. */
export function featuredSlots(featuredCount: number) {
  return { featuredCount: Math.min(featuredCount, HOMEPAGE_FEATURED_BOOKS_MAX), featuredMax: HOMEPAGE_FEATURED_BOOKS_MAX };
}

/** One row of /admin/bookstore/orders. */
export function serializeBookOrderRow(order: BookOrderWithItems & { shippingChargeInrPaise?: number }) {
  return {
    id: order.id,
    shortId: order.id.slice(-8).toUpperCase(),
    status: order.status,
    statusLabel: bookOrderStatusLabel(order.status),
    customerName: order.user.name,
    customerEmail: order.user.email,
    totalAmountInrPaise: order.totalAmountInrPaise,
    shippingChargeInrPaise: order.shippingChargeInrPaise ?? 0,
    paymentMethod: order.paymentMethod,
    upiTransactionId: order.upiTransactionId,
    paymentScreenshotPath: order.paymentScreenshotPath,
    deliveryAddress: order.deliveryAddress && order.deliveryAddress !== "No address provided" ? order.deliveryAddress : null,
    deliveryPinCode: order.deliveryPinCode,
    deliveryPhoneNumber: order.deliveryPhoneNumber,
    notes: order.notes,
    courierServiceName: order.courierServiceName,
    trackingId: order.trackingId,
    paymentRecordId: order.paymentRecordId,
    receiptGeneratedAt: order.receiptGeneratedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      bookId: item.book.id,
      title: item.book.title,
      author: item.book.author,
      imagePath: item.book.imagePath,
      quantity: item.quantity,
      priceAtPurchaseInrPaise: item.priceAtPurchaseInrPaise,
      lineTotalInrPaise: item.priceAtPurchaseInrPaise * item.quantity,
    })),
  };
}
