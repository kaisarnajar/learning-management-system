import type { CourseLevel } from "@/services/courses";

export type CourseFeeSource = {
  priceInrPaise: number;
  monthlyFeeInrPaise: number;
};

export type CoursePricing = {
  registrationFeePaise: number;
  registrationFeeInr: number;
  monthlyFeeInr: number;
  monthlyFeePaise: number;
};

const DEFAULT_PRICING_BY_LEVEL: Record<CourseLevel, { monthlyFeeInr: number }> = {
  Beginner: { monthlyFeeInr: 349 },
  Intermediate: { monthlyFeeInr: 499 },
  Advanced: { monthlyFeeInr: 499 },
};

export function isCourseLevel(level: string): level is CourseLevel {
  return level in DEFAULT_PRICING_BY_LEVEL;
}

export function getDefaultFeesForLevel(level: string): CoursePricing {
  const monthlyFeeInr = isCourseLevel(level)
    ? DEFAULT_PRICING_BY_LEVEL[level].monthlyFeeInr
    : DEFAULT_PRICING_BY_LEVEL.Beginner.monthlyFeeInr;
  return {
    registrationFeePaise: 0,
    registrationFeeInr: 0,
    monthlyFeeInr,
    monthlyFeePaise: monthlyFeeInr * 100,
  };
}

export function getCoursePricingFromCourse(course: CourseFeeSource): CoursePricing {
  const registrationFeePaise = course.priceInrPaise;
  const monthlyFeePaise = course.monthlyFeeInrPaise;
  return {
    registrationFeePaise,
    registrationFeeInr: Math.round(registrationFeePaise / 100),
    monthlyFeePaise,
    monthlyFeeInr: Math.round(monthlyFeePaise / 100),
  };
}

export function getRegistrationFeePaise(course: CourseFeeSource): number {
  return course.priceInrPaise;
}

export function getMonthlyFeePaise(course: CourseFeeSource): number {
  return course.monthlyFeeInrPaise;
}

export function formatEnrollmentFeeLabel(course: CourseFeeSource): string {
  const { registrationFeeInr } = getCoursePricingFromCourse(course);
  if (registrationFeeInr <= 0) return "₹0";
  return `₹${registrationFeeInr}`;
}
