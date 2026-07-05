import { z } from 'zod';
import { formatInputDateValue } from "@/lib/form-date";
import { zodResultToFormValidation, type FormValidationResult } from "@/lib/form-validation";
import {
  blogPostSchema,
  bookSchema,
  courseAnnouncementSchema,
  courseSchema,
  dailyInspirationSchema,
  libraryItemSchema,
  paymentSettingsSchema,
  teacherAdminSchema,
  teacherBlogPostSchema,
  adminStudentSchema,
  siteAnnouncementSchema,
} from "@/lib/validations";
import type { AnnouncementCategory } from "@prisma/client";

export type SiteAnnouncementFormValues = z.infer<typeof siteAnnouncementSchema>;

export function validateSiteAnnouncementForm(values: SiteAnnouncementFormValues): FormValidationResult {
  const eventDate = values.eventDate?.trim()
    ? formatInputDateValue(values.eventDate.trim()) ?? ""
    : "";

  if (values.eventDate?.trim() && !eventDate) {
    return {
      success: false,
      issues: [
        {
          path: ["eventDate"],
          message: "Enter a valid event date or leave the field blank.",
        },
      ],
    };
  }

  if (values.showOnHomepage && !values.published) {
    return {
      success: false,
      issues: [
        {
          path: ["showOnHomepage"],
          message: "Only published announcements can appear on the homepage.",
        },
      ],
    };
  }

  return zodResultToFormValidation(
    siteAnnouncementSchema.safeParse({
      title: values.title,
      body: values.body,
      eventDate,
      location: values.location,
      showOnHomepage: values.showOnHomepage,
      published: values.published,
    }),
  );
}

export type CourseFormValues = z.infer<typeof courseSchema>;

export function validateCourseForm(values: CourseFormValues): FormValidationResult {
  const startDate = formatInputDateValue(values.startDate.trim()) ?? "";

  if (!values.startDate.trim() || !startDate) {
    return {
      success: false,
      issues: [{ path: ["startDate"], message: "Start date is required." }],
    };
  }

  return zodResultToFormValidation(
    courseSchema.safeParse({
      title: values.title,
      description: values.description,
      startDate,
      duration: values.duration,
      level: values.level,
      category: values.category,
      enrollmentFeeInr: values.enrollmentFeeInr,
      monthlyFeeInr: values.monthlyFeeInr,
      feeFrequency: values.feeFrequency,
      teacherId: values.teacherId,
      status: values.status,
    }),
  );
}

export type CourseAnnouncementFormValues = z.infer<typeof courseAnnouncementSchema>;

export function validateCourseAnnouncementForm(
  values: CourseAnnouncementFormValues,
): FormValidationResult {
  return zodResultToFormValidation(
    courseAnnouncementSchema.safeParse({
      category: values.category,
      title: values.title,
      body: values.body,
    }),
  );
}

export type TeacherFormValues = z.infer<typeof teacherAdminSchema>;

export function validateTeacherForm(values: TeacherFormValues): FormValidationResult {
  return zodResultToFormValidation(
    teacherAdminSchema.safeParse({
      email: values.email,
      specialization: values.specialization,
      bio: values.bio,
      initials: values.initials,
      published: values.published,
    }),
  );
}

export type BlogPostFormValues = z.infer<typeof blogPostSchema>;

export function validateBlogPostForm(values: BlogPostFormValues, mode: "admin" | "teacher"): FormValidationResult {
  const schema = mode === "teacher" ? teacherBlogPostSchema : blogPostSchema;
  return zodResultToFormValidation(
    schema.safeParse({
      title: values.title,
      excerpt: values.excerpt,
      body: values.body,
      ...(mode === "admin" ? { published: values.published } : {}),
    }),
  );
}

export type DailyInspirationFormValues = z.infer<typeof dailyInspirationSchema>;

export function validateDailyInspirationForm(values: DailyInspirationFormValues): FormValidationResult {
  return zodResultToFormValidation(
    dailyInspirationSchema.safeParse({
      kind: values.kind,
      arabicText: values.arabicText,
      englishTranslation: values.englishTranslation,
      reference: values.reference,
      published: values.published,
    }),
  );
}

export type LibraryFormValues = z.infer<typeof libraryItemSchema>;

export function validateLibraryForm(values: LibraryFormValues): FormValidationResult {
  return zodResultToFormValidation(
    libraryItemSchema.safeParse({
      title: values.title,
      author: values.author,
      topic: values.topic,
      level: values.level,
      language: values.language,
      pdfUrl: values.pdfUrl,
      published: values.published,
    }),
  );
}

export type PaymentSettingsFormValues = z.infer<typeof paymentSettingsSchema>;

export function validatePaymentSettingsForm(values: PaymentSettingsFormValues): FormValidationResult {
  return zodResultToFormValidation(paymentSettingsSchema.safeParse(values));
}



export type BookFormValues = z.infer<typeof bookSchema>;

export function validateBookForm(values: BookFormValues): FormValidationResult {
  return zodResultToFormValidation(
    bookSchema.safeParse({
      title: values.title,
      author: values.author,
      description: values.description,
      priceInr: values.priceInr,
      mrpInr: values.mrpInr,
      purchasePriceInr: values.purchasePriceInr,
      weightInGrams: values.weightInGrams,
      inventoryPurchased: values.inventoryPurchased,
      status: values.status,
      published: values.published,
      featuredOnHomepage: values.featuredOnHomepage,
    }),
  );
}

export type StudentFormValues = z.infer<typeof adminStudentSchema>;

export function validateStudentForm(values: StudentFormValues): FormValidationResult {
  return zodResultToFormValidation(adminStudentSchema.safeParse(values));
}
