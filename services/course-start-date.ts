import { formatInputDateValue, getFormDateInputValue } from "@/utils/form-date";

export function getCourseStartDateInputValue(stored?: string | null): string {
  return getFormDateInputValue(stored, { ongoingValue: "ongoing" });
}

export function getCourseStartDateFromForm(formData: FormData): string | null {
  const input = String(formData.get("startDate") ?? "").trim();
  if (!input) {
    return null;
  }

  return formatInputDateValue(input);
}
