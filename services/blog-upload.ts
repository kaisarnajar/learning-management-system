import { uploadRulesFor } from "@/services/direct-upload";
import { finalizeStagedUpload, isStagedUpload, pendingUploadsFrom, type PendingUpload } from "@/services/staged-upload";
import { deleteFromR2, uploadToR2, validateUpload } from "@/services/storage";

export { MAX_BLOG_IMAGES, MAX_BLOG_IMAGE_BYTES } from "@/services/blog-limits";

const RULES = uploadRulesFor("blog-image");

/** Declared type and size of a form file; staged uploads are checked when they are finalised. */
export function validateBlogImage(upload: PendingUpload): { error?: string } {
  if (isStagedUpload(upload)) return {};
  if (!upload || upload.size === 0) return { error: "Empty file." };
  return validateUpload(upload, RULES);
}

/** The images a blog form submits: files (form upload) and staged keys (direct upload). */
export function getBlogImageUploads(formData: FormData): PendingUpload[] {
  return pendingUploadsFrom(formData, "images", "blog-image");
}

/** Stores a blog image (bytes are sniffed; a staged upload is verified and moved); throws UploadError when refused. */
export async function saveBlogImage(blogPostId: string, upload: PendingUpload): Promise<string> {
  if (isStagedUpload(upload)) return (await finalizeStagedUpload(upload, blogPostId)).location;
  return uploadToR2("blogs", blogPostId, upload, RULES);
}

export function deleteBlogImageFile(imagePath: string | null | undefined): Promise<void> {
  return deleteFromR2("blogs", imagePath);
}
