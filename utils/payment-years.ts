/**
 * The years a student may pick for a fee payment.
 * Pure (no Prisma, no server APIs), so client components import them
 * here; the service module re-exports them for server code.
 */

/** How many calendar years before the current year students may select. */
export const PAYMENT_YEARS_BACK = 2;

/** How many calendar years after the current year students may select (e.g. 2035, 2040). */
export const PAYMENT_YEARS_FORWARD = 25;

export function getPaymentYearBounds(referenceDate = new Date()) {
  const current = referenceDate.getFullYear();
  return {
    min: current - PAYMENT_YEARS_BACK,
    max: current + PAYMENT_YEARS_FORWARD,
  };
}

export function getPaymentYearOptions(referenceDate = new Date()): string[] {
  const { min, max } = getPaymentYearBounds(referenceDate);
  const years: string[] = [];
  for (let y = min; y <= max; y++) {
    years.push(String(y));
  }
  return years;
}

export function isPaymentYearAllowed(year: string, referenceDate = new Date()): boolean {
  const y = Number.parseInt(year, 10);
  if (!Number.isFinite(y) || year.length !== 4) return false;
  const { min, max } = getPaymentYearBounds(referenceDate);
  return y >= min && y <= max;
}
