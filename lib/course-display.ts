const courseLevelColors: Record<string, string> = {
  Beginner: "bg-warning-bg text-warning-text",
  Intermediate: "bg-surface-muted-hover text-muted",
  Advanced: "bg-teal-100 text-teal-900",
};

export function getCourseLevelClass(level: string): string {
  return courseLevelColors[level] ?? "bg-surface-muted text-foreground";
}
