import type { BookStatus } from "@prisma/client";

/**
 * Labels and badge classes for book and order statuses. Pure, so client
 * components can import them without pulling services/bookstore (and Prisma)
 * into the browser bundle.
 */

export function bookStatusLabel(status: BookStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "Available";
    case "OUT_OF_STOCK":
      return "Out of Stock";
    case "COMING_SOON":
      return "Coming Soon";
    default:
      return status;
  }
}

export function bookStatusClass(status: BookStatus): string {
  switch (status) {
    case "AVAILABLE":
      return "bg-success-bg text-success-text";
    case "OUT_OF_STOCK":
      return "bg-destructive-bg text-destructive-text";
    case "COMING_SOON":
      return "bg-warning-bg text-warning-text";
    default:
      return "bg-surface-muted-hover text-muted";
  }
}

export function bookOrderStatusLabel(status: string): string {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "Pending Verification";
    case "APPROVED":
      return "Approved";
    case "DECLINED":
      return "Declined";
    case "SHIPPED":
      return "Shipped";
    case "REFUNDED":
      return "Refunded";
    default:
      return status;
  }
}

export function bookOrderStatusClass(status: string): string {
  switch (status) {
    case "PENDING_VERIFICATION":
      return "bg-warning-bg text-warning-text";
    case "APPROVED":
      return "bg-success-bg text-success-text";
    case "DECLINED":
      return "bg-destructive-bg text-destructive-text";
    case "SHIPPED":
      return "bg-info-bg text-info-text";
    case "REFUNDED":
      return "bg-surface-muted-hover text-muted";
    default:
      return "bg-surface-muted-hover text-muted";
  }
}
