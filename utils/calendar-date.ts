/**
 * Helpers for calendar dates stored in `@db.Date` columns (attendance days,
 * exam dates). Prisma returns those as a Date at 00:00 UTC, so they must be
 * formatted in UTC; formatting in the viewer's zone shows the previous day for
 * anyone west of UTC.
 */

export function formatCalendarDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" },
): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(date));
}

/** YYYY-MM-DD of a stored `@db.Date` value, for `<input type="date">`. */
export function toDateInputValue(date: Date | string): string {
  return new Date(date).toISOString().split("T")[0];
}

/** Today's date in the viewer's own calendar (not UTC), as YYYY-MM-DD. */
export function todayDateInputValue(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Marks with at most two decimals, without trailing zeros on whole numbers. */
export function formatMarks(marks: number): string {
  return Number.isInteger(marks) ? String(marks) : marks.toFixed(2);
}
