export const inputClassName =
  "mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export const labelClassName = "block text-sm font-medium text-foreground";

export const adminActionButtonClassName =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-primary bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-60";

export const adminDestructiveButtonClassName =
  "inline-flex min-h-9 items-center justify-center rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg/85 transition-colors disabled:opacity-60";

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
