/**
 * Formats an amount held in paise as rupees.
 *
 * Default is the whole-rupee display used for fees ("₹1,500"). Pass `{ exact: true }` for the
 * bookstore, where prices carry paise and are shown with two decimals ("₹499.50").
 */
export function formatPrice(paise: number, options: { exact?: boolean } = {}): string {
  if (options.exact) {
    return `₹${(paise / 100).toFixed(2)}`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}
