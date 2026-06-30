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
  siteAnnouncementSchema,
  socialLinksSettingsSchema,
  academySettingsSchema,
  teacherAdminSchema,
  teacherBlogPostSchema,
} from "@/lib/validations";
import type { AnnouncementCategory } from "@prisma/client";

export type SiteAnnouncementFormValues = {
  title: string;
  body: string;
  location: string;
  eventDate: string;
  showOnHomepage: boolean;
  published: boolean;
};

export function validateSiteAnnouncementForm(values: SiteAnnouncementFormValues): FormValidationResult {
  const eventDate = values.eventDate.trim()
    ? formatInputDateValue(values.eventDate.trim()) ?? ""
    : "";

  if (values.eventDate.trim() && !eventDate) {
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

export type CourseFormValues = {
  title: string;
  description: string;
  startDate: string;
  duration: string;
  category: string;
  teacherId: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  enrollmentFeeInr: string;
  monthlyFeeInr: string;
  status: string;
};

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
      teacherId: values.teacherId,
      status: values.status,
    }),
  );
}

export type CourseAnnouncementFormValues = {
  category: AnnouncementCategory;
  title: string;
  body: string;
};

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

export type TeacherFormValues = {
  email: string;
  specialization: string;
  bio: string;
  initials: string;
  published: boolean;
};

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

export type BlogPostFormValues = {
  title: string;
  excerpt: string;
  body: string;
  published: boolean;
};

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

export type DailyInspirationFormValues = {
  kind: "QURAN" | "HADITH";
  arabicText: string;
  englishTranslation: string;
  reference: string;
  published: boolean;
};

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

export type LibraryFormValues = {
  title: string;
  author: string;
  topic: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  language: string;
  pdfUrl: string;
  published: boolean;
};

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

export type PaymentSettingsFormValues = {
  upiId: string;
  upiPayeeName: string;
  bankAccountName: string;
  bankName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankBranch: string;
};

export function validatePaymentSettingsForm(values: PaymentSettingsFormValues): FormValidationResult {
  return zodResultToFormValidation(paymentSettingsSchema.safeParse(values));
}

export type SocialLinksFormValues = {
  contactEmail: string;
  whatsappNumber: string;
  whatsappDefaultMessage: string;
  facebookUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
};

export function validateSocialLinksForm(values: SocialLinksFormValues): FormValidationResult {
  return zodResultToFormValidation(socialLinksSettingsSchema.safeParse(values));
}

export type AcademySettingsFormValues = {
  academyName: string;
  academyAddress: string;
  academyWebsite: string;
};

export function validateAcademySettingsForm(values: AcademySettingsFormValues): FormValidationResult {
  return zodResultToFormValidation(academySettingsSchema.safeParse(values));
}

export type BookFormValues = {
  title: string;
  author: string;
  description: string;
  priceInr: string;
  mrpInr?: string;
  purchasePriceInr: string;
  weightInGrams: string;
  inventoryPurchased: string;
  status: "AVAILABLE" | "OUT_OF_STOCK" | "COMING_SOON";
  published: boolean;
  featuredOnHomepage: boolean;
};

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
