/**
 * Fatwa question categories.
 * Pure (no Prisma, no server APIs), so client components import them
 * here; the service module re-exports them for server code.
 */

export const BASE_CATEGORIES = [
  "Islam",
  "Quran",
  "Hadith",
  "Fiqh",
  "Tajweed",
  "Seerah",
  "Arabic Language",
  "Atheism",
  "Fatwa",
] as const;

export const FATWA_CATEGORIES = [...BASE_CATEGORIES, "Others"] as const;
export type FatwaCategory = (typeof FATWA_CATEGORIES)[number];

export function isFatwaCategory(value: string): value is FatwaCategory {
  return FATWA_CATEGORIES.includes(value as FatwaCategory);
}

export const FATWA_CATEGORY_OPTIONS = FATWA_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

export function getFatwaCategoryOptions(current?: string | null) {
  if (!current || isFatwaCategory(current)) {
    return FATWA_CATEGORY_OPTIONS;
  }
  return [{ value: current, label: current }, ...FATWA_CATEGORY_OPTIONS];
}
