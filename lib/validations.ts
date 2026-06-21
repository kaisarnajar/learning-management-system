import { z } from "zod";
import {
  PROFILE_COUNTRY_CODES,
  getProfileCountryOrDefault,
  isValidProfileLocalNumber,
} from "@/lib/countries";
import { COURSE_CATEGORIES } from "@/lib/course-categories";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_TEACHER_SALARY } from "@/lib/expense-categories";
import { FATWA_CATEGORIES } from "@/lib/fatwa";
import { LIBRARY_LANGUAGES, LIBRARY_TOPICS } from "@/lib/library-options";
import { isPaymentYearAllowed } from "@/lib/monthly-payments";
import { OCCUPATION_VALUES } from "@/lib/occupations";

export const levelEnum = z.enum(["Beginner", "Intermediate", "Advanced"]);

export const courseStatusEnum = z.enum([
  "DRAFT",
  "PUBLISHED",
  "ONGOING",
  "COMPLETED",
  "ON_HOLD",
]);

export const courseCategoryEnum = z.enum(COURSE_CATEGORIES);

export const courseSchema = z.object({
  title: z.string().min(3, "Title is required"),
  description: z.string().min(10, "Description is required"),
  startDate: z.string().min(1, "Start date is required."),
  duration: z.string().trim().min(1, "Duration is required.").max(80, "Duration is too long."),
  level: levelEnum,
  category: courseCategoryEnum,
  enrollmentFeeInr: z.coerce.number().min(0, "Enrollment fee cannot be negative."),
  monthlyFeeInr: z.coerce.number().min(0, "Monthly fee cannot be negative."),
  teacherId: z.string().min(1, "Teacher is required"),
  status: courseStatusEnum,
});

/** Admin teacher profile fields (name comes from the linked user account). */
export const teacherAdminSchema = z.object({
  email: z.string().trim().email("Enter the teacher's registered account email."),
  specialization: z.string().min(2, "Specialization is required"),
  bio: z.string().min(10, "Bio is required"),
  initials: z
    .string()
    .trim()
    .max(4, "Max 4 characters")
    .optional()
    .or(z.literal("")),
  imageUrl: z.string().url().optional().or(z.literal("")),
  published: z.coerce.boolean(),
});

export const libraryLanguageEnum = z.enum(LIBRARY_LANGUAGES);
export const libraryTopicEnum = z.enum(LIBRARY_TOPICS);

export const libraryItemSchema = z.object({
  title: z.string().min(2, "Title is required"),
  author: z.string().min(2, "Author is required"),
  topic: libraryTopicEnum,
  level: levelEnum,
  language: libraryLanguageEnum,
  pdfUrl: z
    .string()
    .trim()
    .min(1, "PDF URL is required.")
    .url("Enter a valid PDF URL."),
  published: z.coerce.boolean(),
});

export const fatwaCategoryEnum = z.enum(FATWA_CATEGORIES, { message: "Select a topic." });

export const fatwaQuestionSchema = z.object({
  category: fatwaCategoryEnum,
  title: z.string().trim().min(10, "Title must be at least 10 characters.").max(200),
  question: z.string().trim().min(30, "Question must be at least 30 characters.").max(5000),
  askerName: z.string().trim().min(2, "Name is required.").max(100),
  askerEmail: z.string().trim().email("Enter a valid email address."),
});

export const fatwaAnswerSchema = z.object({
  answer: z.string().trim().min(20, "Answer must be at least 20 characters.").max(10000),
});

export const adminEnrollUserSchema = z.object({
  email: z.string().trim().email("Enter a valid student email."),
  courseId: z.string().min(1, "Select a course."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset link is invalid."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const optionalHttpUrl = z
  .string()
  .trim()
  .refine((value) => value === "" || /^https?:\/\/.+/i.test(value), {
    message: "Enter a full URL starting with http:// or https://, or leave blank.",
  });

export const socialLinksSettingsSchema = z.object({
  contactEmail: z.string().trim().email("Enter a valid contact email address."),
  whatsappNumber: z
    .string()
    .trim()
    .min(10, "WhatsApp number must be at least 10 digits.")
    .max(15, "WhatsApp number is too long.")
    .regex(/^\d+$/, "WhatsApp number must contain only digits."),
  whatsappDefaultMessage: z.string().trim().max(500),
  facebookUrl: optionalHttpUrl,
  instagramUrl: optionalHttpUrl,
  youtubeUrl: optionalHttpUrl,
});

export const academySettingsSchema = z.object({
  academyName: z.string().trim().min(2, "Academy name is required."),
  academyAddress: z.string().trim().min(5, "Academy address is required."),
  academyWebsite: z.string().trim().min(4, "Website is required."),
});

export const paymentSettingsSchema = z.object({
  upiId: z
    .string()
    .trim()
    .min(1, "UPI ID is required.")
    .max(120)
    .regex(/^[\w.-]+@[\w.-]+$/, "Enter a valid UPI ID (e.g. name@bank)."),
  upiPayeeName: z.string().trim().min(1, "Payee name is required.").max(100),
  bankAccountName: z.string().trim().min(1, "Account name is required.").max(120),
  bankName: z.string().trim().min(1, "Bank name is required.").max(120),
  bankAccountNumber: z.string().trim().min(1, "Account number is required.").max(40),
  bankIfsc: z.string().trim().min(1, "IFSC is required.").max(20),
  bankBranch: z.string().trim().max(200).optional().or(z.literal("")),
});

export const monthlyPaymentSubmitSchema = z.object({
  courseId: z.string().min(1),
  paymentMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Select a valid month."),
  paymentYear: z
    .string()
    .regex(/^\d{4}$/, "Enter a valid year.")
    .refine(isPaymentYearAllowed, { message: "Select a fee year from the list." }),
  paymentMethod: z.enum(["upi", "bank"]),
  upiTransactionId: z
    .string()
    .trim()
    .min(8, "Enter a valid transaction / UTR reference (at least 8 characters).")
    .max(50)
    .regex(/^[a-zA-Z0-9]+$/, "Reference should contain only letters and numbers."),
});

export const enrollmentPaymentSubmitSchema = z.object({
  courseId: z.string().min(1),
  paymentMethod: z.enum(["upi", "bank"]),
  upiTransactionId: z
    .string()
    .trim()
    .min(8, "Enter a valid transaction / UTR reference (at least 8 characters).")
    .max(50)
    .regex(/^[a-zA-Z0-9]+$/, "Reference should contain only letters and numbers."),
});

export const occupationEnum = z.enum(OCCUPATION_VALUES);

export const profileCountryEnum = z.enum(PROFILE_COUNTRY_CODES);

export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
    fatherName: z.string().trim().min(2, "Father's name must be at least 2 characters.").max(100),
    dateOfBirth: z
      .string()
      .min(1, "Date of birth is required.")
      .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date of birth.")
      .refine((value) => {
        const dob = new Date(value);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return dob <= today;
      }, "Date of birth cannot be in the future.")
      .refine((value) => {
        const dob = new Date(value);
        const minAge = new Date();
        minAge.setFullYear(minAge.getFullYear() - 5);
        return dob <= minAge;
      }, "Enter a valid date of birth."),
    occupation: occupationEnum,
    address: z.string().trim().min(10, "Address must be at least 10 characters.").max(500),
    country: profileCountryEnum,
    whatsapp: z.string().trim(),
  })
  .superRefine((data, ctx) => {
    const country = getProfileCountryOrDefault(data.country);
    const digits = data.whatsapp.replace(/\D/g, "");

    if (!/^\d+$/.test(digits)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "WhatsApp number must contain only digits.",
        path: ["whatsapp"],
      });
      return;
    }

    if (!isValidProfileLocalNumber(country, digits)) {
      const lengthMessage =
        country.localNumberMinLength === country.localNumberMaxLength
          ? `WhatsApp number must be exactly ${country.localNumberMinLength} digits.`
          : `WhatsApp number must be ${country.localNumberMinLength} to ${country.localNumberMaxLength} digits.`;
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: lengthMessage,
        path: ["whatsapp"],
      });
    }
  });

export const announcementCategoryEnum = z.enum([
  "EXAMS_TESTS",
  "ASSIGNMENTS_HOMEWORK",
  "STUDY_MATERIALS",
  "CLASS_SCHEDULE",
  "COURSE_ANNOUNCEMENT",
  "GENERAL_NOTICE",
]);

export const blogPostSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  excerpt: z.string().trim().max(400).optional().or(z.literal("")),
  body: z.string().trim().min(20, "Blog content must be at least 20 characters.").max(50000),
  published: z.coerce.boolean(),
});

export const teacherBlogPostSchema = blogPostSchema.omit({ published: true });

export const studentReviewSchema = z.object({
  quote: z
    .string()
    .trim()
    .min(20, "Your review must be at least 20 characters.")
    .max(1000, "Review must be at most 1000 characters."),
  course: z.string().trim().max(120).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  rating: z.coerce
    .number()
    .int("Select a star rating from 1 to 5.")
    .min(1, "Select a star rating from 1 to 5.")
    .max(5, "Rating must be at most 5 stars."),
});

export const dailyInspirationKindEnum = z.enum(["QURAN", "HADITH"]);

export const dailyInspirationSchema = z.object({
  kind: dailyInspirationKindEnum,
  arabicText: z.string().trim().min(1, "Arabic text is required.").max(5000),
  englishTranslation: z
    .string()
    .trim()
    .min(1, "English translation is required.")
    .max(5000),
  reference: z.string().trim().max(300).optional().or(z.literal("")),
  published: z.coerce.boolean(),
});

export const siteAnnouncementSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  body: z.string().trim().min(10, "Message must be at least 10 characters.").max(10000),
  eventDate: z.string().trim().max(120).optional().or(z.literal("")),
  location: z.string().trim().max(200).optional().or(z.literal("")),
  showOnHomepage: z.boolean(),
  published: z.boolean(),
});

export const courseAnnouncementSchema = z.object({
  category: announcementCategoryEnum,
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(200),
  body: z.string().trim().min(10, "Message must be at least 10 characters.").max(10000),
});

export const paymentRecordSchema = z.object({
  courseId: z.string().optional(),
  amountInr: z.coerce.number().positive("Amount must be greater than zero."),
  paidAt: z.string().min(1, "Payment date is required."),
  description: z.string().trim().max(500).optional(),
});

const expenseCategoryEnum = z.enum(EXPENSE_CATEGORIES);

export const expenseSchema = z
  .object({
    category: expenseCategoryEnum,
    amountInr: z.coerce.number().positive("Amount must be greater than zero."),
    paidAt: z.string().min(1, "Payment date is required."),
    description: z.string().trim().max(500).optional(),
    teacherId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.category === EXPENSE_CATEGORY_TEACHER_SALARY && !data.teacherId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a teacher for salary expenses.",
        path: ["teacherId"],
      });
    }
  });

export const contactInquirySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(100),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a valid phone number.")
    .max(20, "Phone number is too long.")
    .refine((value) => {
      const digits = value.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }, "Enter a valid phone number with 7 to 15 digits."),
  message: z
    .string()
    .trim()
    .min(20, "Your message must be at least 20 characters.")
    .max(5000, "Message must be at most 5000 characters."),
});

export const contactInquiryReplySchema = z.object({
  reply: z
    .string()
    .trim()
    .min(10, "Reply must be at least 10 characters.")
    .max(10000, "Reply must be at most 10000 characters."),
});

const bookStatusEnum = z.enum(["AVAILABLE", "OUT_OF_STOCK", "COMING_SOON"]);

export const bookSchema = z.object({
  title: z.string().trim().min(2, "Title is required.").max(200, "Title is too long."),
  author: z.string().trim().min(2, "Author is required.").max(200, "Author is too long."),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(5000, "Description is too long."),
  priceInr: z
    .string()
    .trim()
    .min(1, "Price is required.")
    .refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n >= 0;
    }, "Price must be a non-negative number."),
  purchasePriceInr: z
    .string()
    .trim()
    .min(1, "Purchase price is required.")
    .refine((v) => {
      const n = parseFloat(v);
      return !isNaN(n) && n >= 0;
    }, "Purchase price must be a non-negative number."),
  inventoryPurchased: z
    .string()
    .trim()
    .min(1, "Inventory purchased is required.")
    .refine((v) => {
      const n = parseInt(v, 10);
      return !isNaN(n) && n >= 0;
    }, "Inventory must be a non-negative integer."),
  status: bookStatusEnum,
  published: z.boolean(),
  featuredOnHomepage: z.boolean().optional(),
});

export const bookstoreCheckoutSchema = z.object({
  items: z.array(
    z.object({
      bookId: z.string().min(1, "Book ID is required."),
      quantity: z.number().int().min(1, "Quantity must be at least 1."),
    })
  ).min(1, "Cart cannot be empty."),
  paymentMethod: z.string().min(1, "Payment method is required."),
  upiTransactionId: z.string().trim().min(1, "Transaction / UTR reference is required."),
  deliveryAddress: z.string().trim().min(10, "Delivery address must be at least 10 characters long."),
  deliveryPinCode: z.string().trim().regex(/^[0-9]{5,10}$/, "Valid pin code is required."),
  deliveryPhoneNumber: z.string().trim().regex(/^[0-9+\-\s()]{10,20}$/, "Valid phone number is required."),
  notes: z.string().trim().optional(),
});
