export const FILE_CONFIG = {
  // Max sizes in bytes
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_PDF_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_ATTACHMENT_SIZE_BYTES: 15 * 1024 * 1024, // 15MB
  MAX_AVATAR_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  
  // Allowed types
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/png", "image/webp"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf"],
  ALLOWED_ATTACHMENT_TYPES: [
    "application/pdf", 
    "image/jpeg", 
    "image/png", 
    "application/msword", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ],

  // S3 Folders / Keys
  FOLDERS: {
    PROFILES: "profiles",
    COURSES: "courses",
    BLOGS: "blogs",
    BOOKS: "books",
    ANNOUNCEMENTS: "announcements",
    RECEIPTS: "receipts",
  }
} as const;
