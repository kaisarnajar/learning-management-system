import fs from 'fs';

const files = [
  'app/admin/blog-approvals/[id]/page.tsx',
  'app/admin/blog-approvals/page.tsx',
  'app/admin/enrollments/page.tsx',
  'app/admin/review-approvals/[id]/page.tsx',
  'app/admin/review-approvals/page.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import { ApproveBlogPostButton } from "@\/components\/admin\/ApproveBlogPostButton";\n?/g, '');
  content = content.replace(/import { RejectBlogPostButton } from "@\/components\/admin\/RejectBlogPostButton";\n?/g, 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { approveBlogPost, rejectBlogPost } from "@/app/admin/blog-approvals/actions";\n');
  
  content = content.replace(/import { ApproveEnrollmentButton } from "@\/components\/admin\/ApproveEnrollmentButton";\n?/g, '');
  content = content.replace(/import { RejectEnrollmentButton } from "@\/components\/admin\/RejectEnrollmentButton";\n?/g, 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { approveEnrollment, rejectEnrollment, removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";\n');
  content = content.replace(/import { RemoveEnrollmentButton } from "@\/components\/admin\/RemoveEnrollmentButton";\n?/g, '');

  content = content.replace(/import { ApproveStudentReviewButton } from "@\/components\/admin\/ApproveStudentReviewButton";\n?/g, '');
  content = content.replace(/import { RejectStudentReviewButton } from "@\/components\/admin\/RejectStudentReviewButton";\n?/g, 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { approveStudentReview, rejectStudentReview } from "@/app/admin/review-approvals/actions";\n');

  fs.writeFileSync(file, content);
}
