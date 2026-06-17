const courseCategoryGradients: Record<string, string> = {
  Tajweed: "from-amber-800 to-amber-600",
  Seerah: "from-violet-800 to-violet-600",
  Arabic: "from-slate-700 to-slate-500",
  Hifz: "from-teal-900 to-cyan-700",
  Quran: "from-teal-800 to-teal-600",
  Fiqh: "from-indigo-800 to-indigo-600",
  Tafsir: "from-blue-800 to-blue-600",
  Aqeedah: "from-rose-800 to-rose-600",
  Hadith: "from-orange-800 to-orange-600",
  Duas: "from-emerald-800 to-emerald-600",
  Islamic: "from-emerald-800 to-emerald-600",
  default: "from-stone-700 to-stone-500",
};

const courseLevelColors: Record<string, string> = {
  Beginner: "bg-warning-bg text-warning-text",
  Intermediate: "bg-surface-muted-hover text-muted",
  Advanced: "bg-teal-100 text-teal-900",
};

export function getCourseBannerClass(category: string): string {
  const key = Object.keys(courseCategoryGradients).find((k) =>
    category.toLowerCase().includes(k.toLowerCase()),
  );
  return courseCategoryGradients[key ?? "default"];
}

export function getCourseLevelClass(level: string): string {
  return courseLevelColors[level] ?? "bg-slate-100 text-slate-800";
}
