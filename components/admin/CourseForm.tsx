"use client";
import { SubmitButton } from "@/components/shared/SubmitButton";

import type { Course, CourseStatus, Teacher } from "@prisma/client";
import { useCallback, useState } from "react";
import { DateInputField } from "@/components/form/DateInputField";
import {
  type CourseFormValues,
  validateCourseForm,
} from "@/services/admin-form-validation";
import { getCourseCategoryOptions } from "@/services/course-categories";
import { getCourseStartDateInputValue } from "@/services/course-start-date";
import { HOMEPAGE_FEATURED_COURSES_MAX } from "@/services/courses";
import { getCoursePricingFromCourse, getDefaultFeesForLevel } from "@/services/course-pricing";
import { COURSE_STATUS_OPTIONS } from "@/services/course-status";
import { FEE_FREQUENCY_OPTIONS, getFeeFrequencyOption } from "@/services/fee-frequency";
import { labelClassName } from "@/utils/form";
import { formErrorTextClassName, formFieldInputClass } from "@/utils/form-validation";
import { useZodForm } from "@/utils/use-zod-form";

type CourseFormProps = {
  course?: Course;
  teachers: Teacher[];
  featuredCount: number;
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
};

const COURSE_FIELDS: (keyof CourseFormValues)[] = [
  "title",
  "description",
  "startDate",
  "duration",
  "category",
  "teacherId",
  "level",
  "enrollmentFeeInr",
  "monthlyFeeInr",
  "feeFrequency",
  "status",
];

export function CourseForm({ course, teachers, featuredCount, action, submitLabel }: CourseFormProps) {
  const feeDefaults = course
    ? getCoursePricingFromCourse(course)
    : getDefaultFeesForLevel("Beginner");
  const startDateInputValue = getCourseStartDateInputValue(course?.startDate);
  const categoryOptions = getCourseCategoryOptions(course?.category);
  const isCurrentlyFeatured = course?.featuredOnHomepage ?? false;
  const featuredSlotsFull = featuredCount >= HOMEPAGE_FEATURED_COURSES_MAX;
  const canFeatureThisCourse = isCurrentlyFeatured || !featuredSlotsFull;
  const displayedFeaturedCount = Math.min(featuredCount, HOMEPAGE_FEATURED_COURSES_MAX);

  const validate = useCallback((values: CourseFormValues) => validateCourseForm(values), []);

  const { values, updateField, markTouched, showError, errors, isValid } = useZodForm({
    initialValues: {
      title: course?.title ?? "",
      description: course?.description ?? "",
      startDate: startDateInputValue,
      duration: course?.duration ?? "",
      category: course?.category ?? "",
      teacherId: course?.teacherId ?? "",
      level: (course?.level ?? "Beginner") as CourseFormValues["level"],
      enrollmentFeeInr: feeDefaults.registrationFeeInr,
      monthlyFeeInr: feeDefaults.monthlyFeeInr,
      feeFrequency: (course?.feeFrequency ?? "MONTHLY") as CourseFormValues["feeFrequency"],
      status: course?.status ?? "PUBLISHED",
    },
    fields: COURSE_FIELDS,
    validate,
  });

  const startDateError = showError("startDate") ? errors.startDate : undefined;

  const [categorySelect, setCategorySelect] = useState(() => {
    const val = course?.category ?? "";
    const isStandard = categoryOptions.some((opt) => opt.value === val);
    if (val && !isStandard) return "Other";
    return val;
  });
  const isCustomCategory = categorySelect === "Other";

  function updateStatus(status: string) {
    updateField("status", status as CourseStatus);
  }

  return (
    <form action={action} className="mx-auto max-w-2xl space-y-5">
      <div>
        <label htmlFor="title" className={labelClassName}>
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          value={values.title}
          onChange={(e) => updateField("title", e.target.value)}
          onBlur={() => markTouched("title")}
          aria-invalid={showError("title") || undefined}
          className={formFieldInputClass(showError("title"))}
        />
        {showError("title") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.title}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="description" className={labelClassName}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          value={values.description}
          onChange={(e) => updateField("description", e.target.value)}
          onBlur={() => markTouched("description")}
          aria-invalid={showError("description") || undefined}
          className={formFieldInputClass(showError("description"))}
        />
        {showError("description") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.description}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <DateInputField
          id="startDate"
          name="startDate"
          label="Start date"
          value={values.startDate}
          onChange={(value) => updateField("startDate", value)}
          onBlur={() => markTouched("startDate")}
          required
          hasError={Boolean(startDateError)}
          errorMessage={startDateError}
          errorId="start-date-error"
          className="sm:col-span-2"
        />
        <div>
          <label htmlFor="duration" className={labelClassName}>
            Duration
          </label>
          <input
            id="duration"
            name="duration"
            required
            placeholder="e.g. 6 months, 1 year"
            value={values.duration}
            onChange={(e) => updateField("duration", e.target.value)}
            onBlur={() => markTouched("duration")}
            aria-invalid={showError("duration") || undefined}
            className={formFieldInputClass(showError("duration"))}
          />
          <p className="mt-1 text-xs text-muted">Shown on course listings and detail pages.</p>
          {showError("duration") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.duration}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="categorySelect" className={labelClassName}>
            Category
          </label>
          <select
            id="categorySelect"
            name={isCustomCategory ? "categorySelect" : "category"}
            required
            value={categorySelect}
            onChange={(e) => {
              const val = e.target.value;
              setCategorySelect(val);
              if (val !== "Other") {
                updateField("category", val);
                markTouched("category");
              } else {
                updateField("category", "");
              }
            }}
            className={formFieldInputClass(showError("category") && !isCustomCategory)}
          >
            <option value="" disabled>
              Select a category
            </option>
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {isCustomCategory && (
            <div className="mt-4">
              <label htmlFor="customCategory" className={labelClassName}>
                Specify Category <span className="text-destructive-text">*</span>
              </label>
              <input
                id="customCategory"
                name="category"
                type="text"
                required
                value={values.category}
                onChange={(e) => updateField("category", e.target.value)}
                onBlur={() => markTouched("category")}
                aria-invalid={showError("category") || undefined}
                placeholder="Enter custom category"
                className={formFieldInputClass(showError("category"))}
              />
            </div>
          )}
          {showError("category") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.category}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="teacherId" className={labelClassName}>
          Instructor
        </label>
        <select
          id="teacherId"
          name="teacherId"
          required
          value={values.teacherId}
          onChange={(e) => {
            updateField("teacherId", e.target.value);
            markTouched("teacherId");
          }}
          onBlur={() => markTouched("teacherId")}
          aria-invalid={showError("teacherId") || undefined}
          className={formFieldInputClass(showError("teacherId"))}
        >
          <option value="" disabled>
            Select a teacher
          </option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.name} — {teacher.specialization}
            </option>
          ))}
        </select>
        {showError("teacherId") && (
          <p className={formErrorTextClassName} role="alert">
            {errors.teacherId}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="level" className={labelClassName}>
            Level
          </label>
          <select
            id="level"
            name="level"
            value={values.level}
            onChange={(e) =>
              updateField("level", e.target.value as CourseFormValues["level"])
            }
            className={formFieldInputClass(false)}
          >
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
          <p className="mt-1 text-xs text-muted">Used for display; fees are set below per course.</p>
        </div>
      </div>

      <div className="grid gap-5 rounded-lg border border-border bg-background/50 p-4 sm:grid-cols-2">
        <div>
          <label htmlFor="enrollmentFeeInr" className={labelClassName}>
            Enrollment fee (₹)
          </label>
          <input
            id="enrollmentFeeInr"
            name="enrollmentFeeInr"
            type="number"
            min={0}
            step={1}
            required
            value={values.enrollmentFeeInr}
            onChange={(e) => updateField("enrollmentFeeInr", e.target.value === "" ? 0 : Number(e.target.value))}
            onBlur={() => markTouched("enrollmentFeeInr")}
            aria-invalid={showError("enrollmentFeeInr") || undefined}
            className={formFieldInputClass(showError("enrollmentFeeInr"))}
          />
          {showError("enrollmentFeeInr") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.enrollmentFeeInr}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">Use 0 when there is no one-time enrollment fee.</p>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="feeFrequency" className={labelClassName}>
            Fee Frequency
          </label>
          <select
            id="feeFrequency"
            name="feeFrequency"
            value={values.feeFrequency ?? "MONTHLY"}
            onChange={(e) => updateField("feeFrequency", e.target.value as CourseFormValues["feeFrequency"])}
            className={formFieldInputClass(false)}
          >
            {FEE_FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-muted">
            Controls how often students pay the fee below.{" "}
            {getFeeFrequencyOption(values.feeFrequency).value === "ONE_TIME"
              ? "Students pay once (no recurring billing)."
              : `Students pay ${getFeeFrequencyOption(values.feeFrequency).label.toLowerCase()} from their profile.`}
          </p>
        </div>
        <div>
          <label htmlFor="monthlyFeeInr" className={labelClassName}>
            Fee Amount (₹)
          </label>
          <input
            id="monthlyFeeInr"
            name="monthlyFeeInr"
            type="number"
            min={0}
            step={1}
            required
            value={values.monthlyFeeInr}
            onChange={(e) => updateField("monthlyFeeInr", e.target.value === "" ? 0 : Number(e.target.value))}
            onBlur={() => markTouched("monthlyFeeInr")}
            aria-invalid={showError("monthlyFeeInr") || undefined}
            className={formFieldInputClass(showError("monthlyFeeInr"))}
          />
          {showError("monthlyFeeInr") && (
            <p className={formErrorTextClassName} role="alert">
              {errors.monthlyFeeInr}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            Amount due per billing period ({getFeeFrequencyOption(values.feeFrequency).label.toLowerCase()}).
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="status" className={labelClassName}>
          Course status
        </label>
        <select
          id="status"
          name="status"
          required
          value={values.status}
          onChange={(e) => {
            updateStatus(e.target.value);
            markTouched("status");
          }}
          onBlur={() => markTouched("status")}
          className={formFieldInputClass(showError("status"))}
        >
          {COURSE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} title={option.description}>
              {option.label} — {option.description}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-background/40 px-4 py-4">
        <label
          className={`flex items-start gap-3 text-sm text-foreground ${
            canFeatureThisCourse ? "cursor-pointer" : ""
          }`}
        >
          <input
            type="checkbox"
            name="featuredOnHomepage"
            defaultChecked={isCurrentlyFeatured}
            disabled={!canFeatureThisCourse}
            className="mt-1 rounded border-border disabled:cursor-not-allowed"
          />
          <span>
            <span className="font-medium">Show on homepage</span>
            {canFeatureThisCourse ? (
              <span className="mt-0.5 block text-muted">
                Featured in the Featured Courses section when not in draft (up to{" "}
                {HOMEPAGE_FEATURED_COURSES_MAX}; {displayedFeaturedCount}/{HOMEPAGE_FEATURED_COURSES_MAX}{" "}
                slots used). All public courses still appear on the Courses page.
              </span>
            ) : (
              <span className="mt-0.5 block text-muted">
                There are already {HOMEPAGE_FEATURED_COURSES_MAX} featured courses. Remove one course to
                add this course as a featured course.
              </span>
            )}
          </span>
        </label>
      </div>

      {course && (
        <p className="text-xs text-muted">
          Course ID: <code className="rounded bg-background px-1">{course.id}</code>
        </p>
      )}

      <SubmitButton
        type="submit"
        disabled={!isValid}
        className="min-h-11 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-light disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
