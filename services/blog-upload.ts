import { MAX_BLOG_IMAGE_BYTES } from "@/services/blog-limits";
import { deleteFromR2, IMAGE_MIMES, uploadToR2, validateUpload, type UploadRules } from "@/services/storage";

export { MAX_BLOG_IMAGES, MAX_BLOG_IMAGE_BYTES } from "@/services/blog-limits";

const RULES: UploadRules = { allowed: IMAGE_MIMES, maxBytes: MAX_BLOG_IMAGE_BYTES, label: "Each image" };

export function validateBlogImage(file: File): { error?: string } {
  if (!file || file.size === 0) return { error: "Empty file." };
  return validateUpload(file, RULES);
}

export function getBlogImageFiles(formData: FormData): File[] {
  const files = formData.getAll("images");
  return files.filter((f): f is File => f instanceof File && f.size > 0);
}

/** Stores a blog image (bytes are sniffed); throws UploadError when refused. */
export function saveBlogImage(blogPostId: string, file: File): Promise<string> {
  return uploadToR2("blogs", blogPostId, file, RULES);
}

export function deleteBlogImageFile(imagePath: string | null | undefined): Promise<void> {
  return deleteFromR2("blogs", imagePath);
}
