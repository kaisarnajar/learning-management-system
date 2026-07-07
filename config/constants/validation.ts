export const VALIDATION = {
  // Authentication & Users
  PASSWORD_MIN_LENGTH: 8,
  NAME_MAX_LENGTH: 100,
  
  // Content Generation
  TITLE_MAX_LENGTH: 120,
  EXCERPT_MAX_LENGTH: 300,
  BIO_MAX_LENGTH: 500,
  
  // Fatwa & Inquiries
  QUESTION_MAX_LENGTH: 2000,
  MESSAGE_MAX_LENGTH: 2000,
  
  // Reviews
  REVIEW_MAX_LENGTH: 500,
} as const;
