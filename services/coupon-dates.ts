import { businessDayEnd, businessDayStart } from "@/services/business-time";

/**
 * A coupon is valid from the first instant of its first day to the last
 * instant of its last day, as calendar days of the academy
 * (BUSINESS_TIMEZONE), so the stored bounds compare directly with "now".
 *
 * Until 2026-11-24 the days were UTC days (validFrom at 00:00:00.000Z,
 * validUntil at 23:59:59.999Z) and the lookup added a 24-hour buffer, so a
 * Dec 1–31 coupon worked from 05:30 IST on Nov 30 to 05:29 IST on Jan 1.
 * scripts/normalise-coupon-dates.ts re-expresses those rows.
 */

/** Start of a coupon's first day; null for a string that is not a calendar date. */
export function couponDayStart(value: string): Date | null {
  return businessDayStart(value);
}

/** End of a coupon's last day; null for a string that is not a calendar date. */
export function couponDayEnd(value: string): Date | null {
  return businessDayEnd(value);
}

/**
 * The academy-day bound for a bound stored the old (UTC-day) way, or null when
 * the value was not written that way (already converted, or an instant such
 * as a waiver coupon's validFrom, which is the approval time).
 */
export function fromLegacyCouponBound(value: Date, bound: "start" | "end"): Date | null {
  const iso = value.toISOString();
  const day = iso.slice(0, 10);
  if (bound === "start" && iso.endsWith("T00:00:00.000Z")) return couponDayStart(day);
  if (bound === "end" && iso.endsWith("T23:59:59.999Z")) return couponDayEnd(day);
  return null;
}
