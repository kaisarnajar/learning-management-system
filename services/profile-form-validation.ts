import { z } from "zod";
import { zodResultToFormValidation, type FormValidationResult } from "@/utils/form-validation";
import { contactInquirySchema, fatwaQuestionSchema, studentReviewSchema } from "@/utils/validations";
import { BRAND_CONFIG } from "@/config/brand";

export type StudentReviewFormValues = z.infer<typeof studentReviewSchema>;

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

export type ContactInquiryFormValues = z.infer<typeof contactInquirySchema>;

export function validateContactInquiryForm(values: ContactInquiryFormValues): FormValidationResult {
  return zodResultToFormValidation(contactInquirySchema.safeParse(values));
}

export type AskFatwaFormValues = z.infer<typeof fatwaQuestionSchema> & {
  isAnonymous: boolean;
};

export function validateAskFatwaForm(values: AskFatwaFormValues): FormValidationResult {
  const dataToValidate = {
    ...values,
    askerName: values.isAnonymous ? "Anonymous" : values.askerName,
    askerEmail: values.isAnonymous ? `anonymous@${new URL(BRAND_CONFIG.websiteUrl).hostname}` : values.askerEmail,
  };
  return zodResultToFormValidation(fatwaQuestionSchema.safeParse(dataToValidate));
}
