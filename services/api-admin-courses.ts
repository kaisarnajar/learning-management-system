import type { Course } from "@prisma/client";
import { COURSE_CATEGORIES } from "@/services/course-categories";
import { getCoursePricingFromCourse, getDefaultFeesForLevel } from "@/services/course-pricing";
import { getCourseStartDateInputValue } from "@/services/course-start-date";
import { COURSE_STATUS_OPTIONS, courseStatusLabel, isCoursePubliclyVisible } from "@/services/course-status";
import { getFeaturedHomepageCourseCount, HOMEPAGE_FEATURED_COURSES_MAX, type CourseWithTeacher } from "@/services/courses";
import { FEE_FREQUENCY_OPTIONS, getFeeFrequencyLabel } from "@/services/fee-frequency";
import { getAllTeachers } from "@/services/teachers";

/** JSON shapes of /api/v1/admin/courses (the admin course list and the add/edit course form). */

const LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

/** One row of the admin course table. */
export function adminCourseRow(course: CourseWithTeacher, studentCount: number) {
  const fees = getCoursePricingFromCourse(course);
  return {
    id: course.id,
    title: course.title,
    category: course.category,
    level: course.level,
    teacherName: course.teacher?.name ?? null,
    duration: course.duration,
    registrationFeePaise: fees.registrationFeePaise,
    feePaise: fees.monthlyFeePaise,
    feeFrequency: course.feeFrequency ?? "MONTHLY",
    feeFrequencyLabel: getFeeFrequencyLabel(course.feeFrequency),
    studentCount,
    status: course.status,
    statusLabel: courseStatusLabel(course.status),
    featured: course.featuredOnHomepage && isCoursePubliclyVisible(course.status),
    /** Why the website's delete button warns (the delete is refused while students are enrolled). */
    deleteWarning:
      studentCount > 0
        ? `This course can't be deleted because ${studentCount} student${studentCount === 1 ? "" : "s"} ${studentCount === 1 ? "is" : "are"} enrolled.`
        : null,
  };
}

/** The values the edit form starts with, as the website's CourseForm fills them in. */
export function courseFormValues(course: Course) {
  const fees = getCoursePricingFromCourse(course);
  return {
    title: course.title,
    description: course.description,
    startDate: getCourseStartDateInputValue(course.startDate),
    duration: course.duration ?? "",
    category: course.category,
    teacherId: course.teacherId ?? "",
    level: course.level,
    enrollmentFeeInr: fees.registrationFeeInr,
    monthlyFeeInr: fees.monthlyFeeInr,
    feeFrequency: course.feeFrequency ?? "MONTHLY",
    status: course.status,
    featuredOnHomepage: course.featuredOnHomepage,
  };
}

/** Choices and limits of the course form (teachers, categories, statuses, fee frequencies, homepage slots). */
export async function courseFormOptions() {
  const [teachers, featuredCount] = await Promise.all([getAllTeachers(), getFeaturedHomepageCourseCount()]);
  return {
    teachers: teachers.map((t) => ({ id: t.id, name: t.name, specialization: t.specialization })),
    categories: [...COURSE_CATEGORIES],
    levels: LEVELS.map((level) => ({ value: level, label: level, defaultFeeInr: getDefaultFeesForLevel(level).monthlyFeeInr })),
    statuses: COURSE_STATUS_OPTIONS,
    feeFrequencies: FEE_FREQUENCY_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    featuredCount: Math.min(featuredCount, HOMEPAGE_FEATURED_COURSES_MAX),
    featuredMax: HOMEPAGE_FEATURED_COURSES_MAX,
  };
}
