export const inputClassName =
  "mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export const labelClassName = "block text-sm font-medium text-foreground";

export const adminActionButtonClassName =
  "inline-flex h-8 items-center justify-center rounded-md border border-primary bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors disabled:opacity-60";

export const adminDestructiveButtonClassName =
  "inline-flex h-8 items-center justify-center rounded-md border border-red-300 bg-destructive-bg px-3 text-xs font-semibold text-destructive-text hover:bg-destructive-bg/85 transition-colors disabled:opacity-60";

export const adminSecondaryButtonClassName =
  "inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-semibold text-foreground hover:bg-surface-muted transition-colors disabled:opacity-60";

/**
 * Rupees to whole paise, rounding half up on the decimal the user typed:
 * 499.995 is 49999.5 paise and becomes 50000, where `rupees * 100` would give
 * 49999.4999… and round down.
 */
export function rupeesToPaise(rupees: number): number {
  const shifted = Number(`${rupees}e2`);
  return Math.round(Number.isFinite(shifted) ? shifted : rupees * 100);
}
