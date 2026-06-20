import fs from 'fs';

const updates = [
  {
    file: 'app/admin/blog-approvals/page.tsx',
    importSearch: 'import { ApproveBlogPostButton } from "@/components/admin/ApproveBlogPostButton";\nimport { RejectBlogPostButton } from "@/components/admin/RejectBlogPostButton";',
    importReplace: 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { approveBlogPost, rejectBlogPost } from "@/app/admin/blog-approvals/actions";',
    tagSearch: /<ApproveBlogPostButton postId={post\.id} \/>/g,
    tagReplace: '<ConfirmationModal title="Approve Blog Post" description="Approve this blog post and publish it on the public blog?" actionLabel="Approve" variant="primary" onConfirm={async () => { const result = await approveBlogPost(post.id); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} />'
  },
  {
    file: 'app/admin/blog-approvals/page.tsx',
    importSearch: '',
    importReplace: '',
    tagSearch: /<RejectBlogPostButton postId={post\.id} \/>/g,
    tagReplace: '<ConfirmationModal title="Reject Blog Post" description="Reject this blog post and mark it as declined?" actionLabel="Reject" variant="destructive" onConfirm={async () => { const result = await rejectBlogPost(post.id); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} />'
  },
  {
    file: 'app/admin/blog-approvals/[id]/page.tsx',
    importSearch: 'import { ApproveBlogPostButton } from "@/components/admin/ApproveBlogPostButton";\nimport { RejectBlogPostButton } from "@/components/admin/RejectBlogPostButton";',
    importReplace: 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { approveBlogPost, rejectBlogPost } from "@/app/admin/blog-approvals/actions";',
    tagSearch: /<ApproveBlogPostButton postId={post\.id} \/>/g,
    tagReplace: '<ConfirmationModal title="Approve Blog Post" description="Approve this blog post and publish it on the public blog?" actionLabel="Approve" variant="primary" onConfirm={async () => { const result = await approveBlogPost(post.id, "/admin/blog-approvals"); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} />'
  },
  {
    file: 'app/admin/blog-approvals/[id]/page.tsx',
    importSearch: '',
    importReplace: '',
    tagSearch: /<RejectBlogPostButton postId={post\.id} \/>/g,
    tagReplace: '<ConfirmationModal title="Reject Blog Post" description="Reject this blog post and mark it as declined?" actionLabel="Reject" variant="destructive" onConfirm={async () => { const result = await rejectBlogPost(post.id, "/admin/blog-approvals"); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} />'
  },
  {
    file: 'app/admin/enrollments/page.tsx',
    importSearch: 'import { ApproveEnrollmentButton } from "@/components/admin/ApproveEnrollmentButton";\nimport { RejectEnrollmentButton } from "@/components/admin/RejectEnrollmentButton";\nimport { RemoveEnrollmentButton } from "@/components/admin/RemoveEnrollmentButton";',
    importReplace: 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { approveEnrollment, rejectEnrollment, removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";',
    tagSearch: /<ApproveEnrollmentButton\s+enrollmentId={enrollment\.id}\s+courseId={enrollment\.courseId}\s*\/>/g,
    tagReplace: '<ConfirmationModal title="Approve Enrollment" description="Approve this student enrollment and notify them?" actionLabel="Approve" variant="primary" onConfirm={async () => { const result = await approveEnrollment(enrollment.id, enrollment.courseId); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} />'
  },
  {
    file: 'app/admin/enrollments/page.tsx',
    importSearch: '',
    importReplace: '',
    tagSearch: /<RejectEnrollmentButton\s+enrollmentId={enrollment\.id}\s+courseId={enrollment\.courseId}\s*\/>/g,
    tagReplace: '<ConfirmationModal title="Reject Enrollment" description="Reject this student enrollment and notify them?" actionLabel="Reject" variant="destructive" onConfirm={async () => { const result = await rejectEnrollment(enrollment.id, enrollment.courseId); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} />'
  },
  {
    file: 'app/admin/enrollments/page.tsx',
    importSearch: '',
    importReplace: '',
    tagSearch: /<RemoveEnrollmentButton\s+enrollmentId={enrollment\.id}\s+courseId={enrollment\.courseId}\s+studentLabel={enrollment\.user\.name \?\? enrollment\.user\.email}\s*\/>/g,
    tagReplace: '{/* Inline Remove Enrollment */} <ConfirmationModal title="Remove Enrollment" description={`Remove ${enrollment.user.name ?? enrollment.user.email} from this course? Their account will not be deleted; they can enroll again later.`} actionLabel="Remove" variant="destructive" onConfirm={async () => { const result = await removeEnrollmentFromCourse(enrollment.id, enrollment.courseId); if (result?.error) window.alert(result.error); else window.location.reload(); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Remove</button>} />'
  },
  {
    file: 'app/admin/review-approvals/page.tsx',
    importSearch: 'import { ApproveStudentReviewButton } from "@/components/admin/ApproveStudentReviewButton";\nimport { RejectStudentReviewButton } from "@/components/admin/RejectStudentReviewButton";',
    importReplace: 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { approveStudentReview, rejectStudentReview } from "@/app/admin/review-approvals/actions";',
    tagSearch: /<ApproveStudentReviewButton reviewId={reviewId} \/>/g,
    tagReplace: '<ConfirmationModal title="Approve Review" description="Approve this review and display it on the public course page?" actionLabel="Approve" variant="primary" onConfirm={async () => { const result = await approveStudentReview(reviewId); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} />'
  },
  {
    file: 'app/admin/review-approvals/page.tsx',
    importSearch: '',
    importReplace: '',
    tagSearch: /<RejectStudentReviewButton reviewId={reviewId} \/>/g,
    tagReplace: '<ConfirmationModal title="Reject Review" description="Reject this review and mark it as declined?" actionLabel="Reject" variant="destructive" onConfirm={async () => { const result = await rejectStudentReview(reviewId); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} />'
  },
  {
    file: 'app/admin/review-approvals/[id]/page.tsx',
    importSearch: 'import { ApproveStudentReviewButton } from "@/components/admin/ApproveStudentReviewButton";\nimport { RejectStudentReviewButton } from "@/components/admin/RejectStudentReviewButton";',
    importReplace: 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { approveStudentReview, rejectStudentReview } from "@/app/admin/review-approvals/actions";',
    tagSearch: /<ApproveStudentReviewButton reviewId={review\.id} \/>/g,
    tagReplace: '<ConfirmationModal title="Approve Review" description="Approve this review and display it on the public course page?" actionLabel="Approve" variant="primary" onConfirm={async () => { const result = await approveStudentReview(review.id, "/admin/review-approvals"); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-light disabled:opacity-60">Approve</button>} />'
  },
  {
    file: 'app/admin/review-approvals/[id]/page.tsx',
    importSearch: '',
    importReplace: '',
    tagSearch: /<RejectStudentReviewButton reviewId={review\.id} \/>/g,
    tagReplace: '<ConfirmationModal title="Reject Review" description="Reject this review and mark it as declined?" actionLabel="Reject" variant="destructive" onConfirm={async () => { const result = await rejectStudentReview(review.id, "/admin/review-approvals"); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="rounded-md border border-red-300 bg-destructive-bg px-3 py-1.5 text-xs font-semibold text-destructive-text hover:bg-destructive-bg disabled:opacity-60">Reject</button>} />'
  }
];

let success = 0;
for (const update of updates) {
  if (fs.existsSync(update.file)) {
    let content = fs.readFileSync(update.file, 'utf8');
    if (update.importSearch) {
      content = content.replace(update.importSearch, update.importReplace);
    }
    content = content.replace(update.tagSearch, update.tagReplace);
    fs.writeFileSync(update.file, content);
    console.log(`Updated ${update.file}`);
    success++;
  } else {
    console.log(`File not found: ${update.file}`);
  }
}
console.log(`Successfully updated ${success} entries.`);
