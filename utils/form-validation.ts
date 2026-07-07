import { inputClassName } from "@/utils/form";

export const formErrorTextClassName = "mt-1 text-sm text-destructive-text";

export function formFieldInputClass(hasError: boolean, base = inputClassName) {
  return hasError
    ? `${base} border-red-500 focus:border-red-500 focus:ring-red-500`
    : base;
}

export type FormValidationIssue = {
  path: (string | number)[];
  message: string;
};

export type FormValidationResult =
  | { success: true }
  | { success: false; issues: FormValidationIssue[] };

export function zodResultToFormValidation(
  result: { success: true } | { success: false; error: { issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }> } },
): FormValidationResult {
  if (result.success) {
    return { success: true };
  }

  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.map((segment) =>
        typeof segment === "number" ? segment : String(segment),
      ),
      message: issue.message,
    })),
  };
}
