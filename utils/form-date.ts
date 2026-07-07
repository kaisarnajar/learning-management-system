export const FORM_DATE_MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
] as const;

export type FormDateParts = {
  day: string;
  month: string;
  year: string;
};

const EMPTY_DATE_PARTS: FormDateParts = {
  day: "",
  month: "",
  year: "",
};

function partsFromDate(date: Date): FormDateParts {
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: String(date.getMonth() + 1).padStart(2, "0"),
    year: String(date.getFullYear()),
  };
}

function normalizeStoredDateValue(stored?: string | null): string {
  const value = stored?.trim();
  if (!value) return "";

  if (value.includes(" / ")) {
    const segments = value.split(" / ").map((segment) => segment.trim());
    const gregorian = segments.find((segment) =>
      FORM_DATE_MONTHS.some((month) => segment.toLowerCase().includes(month.label.toLowerCase())),
    );
    return gregorian ?? segments[segments.length - 1] ?? value;
  }

  return value;
}

export function getFormDateParts(stored?: string | null, options?: { ongoingValue?: string }): FormDateParts {
  const value = normalizeStoredDateValue(stored);
  if (!value || (options?.ongoingValue && value.toLowerCase() === options.ongoingValue.toLowerCase())) {
    return EMPTY_DATE_PARTS;
  }

  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    return partsFromDate(new Date(parsed));
  }

  const dayMonthYearMatch = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (dayMonthYearMatch) {
    const month = FORM_DATE_MONTHS.find(
      (entry) => entry.label.toLowerCase() === dayMonthYearMatch[2].toLowerCase(),
    );
    if (month) {
      return {
        day: String(Number(dayMonthYearMatch[1])).padStart(2, "0"),
        month: month.value,
        year: dayMonthYearMatch[3],
      };
    }
  }

  const monthYearMatch = value.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (monthYearMatch) {
    const month = FORM_DATE_MONTHS.find(
      (entry) => entry.label.toLowerCase() === monthYearMatch[1].toLowerCase(),
    );
    if (month) {
      return {
        day: "01",
        month: month.value,
        year: monthYearMatch[2],
      };
    }
  }

  return EMPTY_DATE_PARTS;
}

export function formatFormDate(day: string, month: string, year: string): string | null {
  const dayNum = Number(day);
  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!dayNum || !monthNum || !yearNum) {
    return null;
  }

  const date = new Date(yearNum, monthNum - 1, dayNum);
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== monthNum - 1 ||
    date.getDate() !== dayNum
  ) {
    return null;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** YYYY-MM-DD for `<input type="date">` from stored or partial date parts. */
export function formatFormDateInputValue(day: string, month: string, year: string): string {
  if (!day || !month || !year) {
    return "";
  }

  const formatted = formatFormDate(day, month, year);
  if (!formatted) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

export function getFormDateInputValue(
  stored?: string | null,
  options?: { ongoingValue?: string },
): string {
  const parts = getFormDateParts(stored, options);
  return formatFormDateInputValue(parts.day, parts.month, parts.year);
}

/** Convert `<input type="date">` value (YYYY-MM-DD) to stored display format. */
export function formatInputDateValue(input: string): string | null {
  const value = input.trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  return formatFormDate(match[3], match[2], match[1]);
}
