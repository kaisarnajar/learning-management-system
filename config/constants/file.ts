export const FILE_CONFIG = {
  // Max sizes in bytes
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_ATTACHMENT_SIZE_BYTES: 15 * 1024 * 1024, // 15MB
  MAX_AVATAR_SIZE_BYTES: 2 * 1024 * 1024, // 2MB
  // Accepted types per upload kind are in services/upload-kinds.ts (checked by content).
} as const;
