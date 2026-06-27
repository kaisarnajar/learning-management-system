import { zodResultToFormValidation, type FormValidationResult } from "@/lib/form-validation";
import { contactInquirySchema, fatwaQuestionSchema, studentReviewSchema } from "@/lib/validations";

export type StudentReviewFormValues = {
  quote: string;
  course: string;
  location: string;
  rating: number;
};

export function validateStudentReviewForm(values: StudentReviewFormValues): FormValidationResult {
  return zodResultToFormValidation(
    studentReviewSchema.safeParse({
      quote: values.quote,
      course: values.course,
      location: values.location,
      rating: values.rating > 0 ? values.rating : "",
    }),
  );
}

export type ContactInquiryFormValues = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export function validateContactInquiryForm(values: ContactInquiryFormValues): FormValidationResult {
  return zodResultToFormValidation(contactInquirySchema.safeParse(values));
}

export type AskFatwaFormValues = {
  category: string;
  title: string;
  question: string;
  askerName: string;
  askerEmail: string;
  isAnonymous: boolean;
};

export function validateAskFatwaForm(values: AskFatwaFormValues): FormValidationResult {
  const dataToValidate = {
    ...values,
    askerName: values.isAnonymous ? "Anonymous" : values.askerName,
    askerEmail: values.isAnonymous ? "anonymous@darsequranacademy.org" : values.askerEmail,
  };
  return zodResultToFormValidation(fatwaQuestionSchema.safeParse(dataToValidate));
}
