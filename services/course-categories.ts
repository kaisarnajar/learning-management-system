export const COURSE_CATEGORIES = [
  "Tajweed",
  "Seerah",
  "Arabic",
  "Hifz",
  "Quran",
  "Fiqh",
  "Islamic Studies",
  "Tafsir",
  "Aqeedah",
  "Hadith",
  "Duas & Adhkar",
  "Other",
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export const COURSE_CATEGORY_OPTIONS = COURSE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

export function isCourseCategory(value: string): value is CourseCategory {
  return (COURSE_CATEGORIES as readonly string[]).includes(value);
}

export function getCourseCategoryOptions(current?: string | null) {
  if (!current || isCourseCategory(current)) {
    return COURSE_CATEGORY_OPTIONS;
  }

  return [{ value: current, label: current }, ...COURSE_CATEGORY_OPTIONS];
}
