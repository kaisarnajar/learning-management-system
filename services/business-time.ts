import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { BUSINESS_TIMEZONE } from "@/config/constants/business";

/**
 * Calendar helpers pinned to the academy's timezone (BUSINESS_TIMEZONE).
 *
 * Finance filters and "paid on" dates are calendar days for the academy, not
 * for the server (Vercel runs in UTC) or the admin's browser. Every
 * conversion between a "yyyy-MM-dd" string and an instant goes through here
 * so a date never shifts by a day when it is parsed, stored or echoed back
 * into a form.
 */

const DATE_PARAM = /^\d{4}-\d{2}-\d{2}$/;

/** "yyyy-MM-dd" of the instant as seen in the business timezone. */
export function formatBusinessDate(date: Date): string {
  return formatInTimeZone(date, BUSINESS_TIMEZONE, "yyyy-MM-dd");
}

function parseBusinessDay(value: string | undefined, time: string): Date | null {
  const trimmed = value?.trim() ?? "";
  if (!DATE_PARAM.test(trimmed)) return null;
  const instant = fromZonedTime(`${trimmed}T${time}`, BUSINESS_TIMEZONE);
  if (Number.isNaN(instant.getTime())) return null;
  // Rejects overflowed inputs such as 2026-02-31 instead of silently rolling over.
  return formatBusinessDate(instant) === trimmed ? instant : null;
}

/**
 * Human-readable calendar date of an instant in the business timezone, for
 * printed documents and exports ("1 April 2026"). Formatting with the
 * server's zone (UTC on Vercel) dates anything issued between 00:00 and 05:30
 * IST on the previous day, which can disagree with the financial year in a
 * document number.
 */
export function formatBusinessDisplayDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  return date.toLocaleDateString("en-IN", { ...options, timeZone: BUSINESS_TIMEZONE });
}

/** First instant (00:00:00.000) of that calendar day in the business timezone. */
export function businessDayStart(value: string | undefined): Date | null {
  return parseBusinessDay(value, "00:00:00.000");
}

/** Last instant (23:59:59.999) of that calendar day in the business timezone. */
export function businessDayEnd(value: string | undefined): Date | null {
  return parseBusinessDay(value, "23:59:59.999");
}

/** Calendar parts of an instant in the business timezone (month is 0-based). */
export function businessCalendarParts(now: Date): { year: number; month: number; day: number } {
  const zoned = toZonedTime(now, BUSINESS_TIMEZONE);
  return { year: zoned.getFullYear(), month: zoned.getMonth(), day: zoned.getDate() };
}

/**
 * "yyyy-MM-dd" for a calendar date given as parts; month/day may overflow
 * exactly like the Date constructor (month 12 → January next year, day 0 →
 * last day of the previous month).
 */
export function businessDateString(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/** "yyyy-MM-dd" of today in the business timezone, or of the day `days` later. */
export function businessDateFromToday(days = 0, now: Date = new Date()): string {
  const { year, month, day } = businessCalendarParts(now);
  return businessDateString(year, month, day + days);
}
