import fs from 'fs';

let content;

// 1. courses/[id]/students/page.tsx
try {
  content = fs.readFileSync('app/admin/courses/[id]/students/page.tsx', 'utf8');
  content = content.replace(
    /<RemoveEnrollmentButton\s+enrollmentId=\{enrollment\.id\}\s+courseId=\{id\}\s+studentLabel=\{enrollment\.user\.name \?\? enrollment\.user\.email\}\s*\/>/m,
    `<ConfirmationModal title="Remove Enrollment" description={\`Remove \${enrollment.user.name ?? enrollment.user.email} from this course? Their account will not be deleted; they can enroll again later.\`} actionLabel="Remove" variant="destructive" onConfirm={async () => { const result = await removeEnrollmentFromCourse(enrollment.id, id); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="text-sm font-medium text-destructive-text hover:underline">Remove</button>} />`
  );
  fs.writeFileSync('app/admin/courses/[id]/students/page.tsx', content);
} catch(e) { console.error(e) }

// 2. review-approvals/[id]/page.tsx
try {
  content = fs.readFileSync('app/admin/review-approvals/[id]/page.tsx', 'utf8');
  content = content.replace(
    /const result = await approveStudentReview\(review\.id\);/g,
    'const result = await approveStudentReview(review.id, false, "/admin/review-approvals");'
  );
  content = content.replace(
    /const result = await rejectStudentReview\(review\.id\);/g,
    'const result = await rejectStudentReview(review.id, "/admin/review-approvals");'
  );
  fs.writeFileSync('app/admin/review-approvals/[id]/page.tsx', content);
} catch(e) { console.error(e) }

// 3. review-approvals/page.tsx
try {
  content = fs.readFileSync('app/admin/review-approvals/page.tsx', 'utf8');
  content = content.replace(
    /const result = await approveStudentReview\(reviewId\);/g,
    'const result = await approveStudentReview(reviewId, false);'
  );
  fs.writeFileSync('app/admin/review-approvals/page.tsx', content);
} catch(e) { console.error(e) }

// 4. profile/reviews/page.tsx
try {
  content = fs.readFileSync('app/profile/reviews/page.tsx', 'utf8');
  content = content.replace(
    /review\.course\.title/g,
    "review.course?.title"
  );
  fs.writeFileSync('app/profile/reviews/page.tsx', content);
} catch(e) { console.error(e) }

// 5. TeacherCourseAnnouncementCard.tsx
try {
  content = fs.readFileSync('components/teacher/TeacherCourseAnnouncementCard.tsx', 'utf8');
  content = content.replace(
    /action=\{deleteAction\.bind\(null, courseId, announcementId\)\}/g,
    'action={deleteCourseAnnouncement.bind(null, courseId, announcementId)}'
  );
  // and add import back!
  content = content.replace(
    /import \{ DeleteActionButton \} from "@\/components\/shared\/DeleteActionButton";/,
    'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteCourseAnnouncement } from "@/lib/course-announcement-actions";'
  );
  fs.writeFileSync('components/teacher/TeacherCourseAnnouncementCard.tsx', content);
} catch(e) { console.error(e) }

console.log("TS fixes applied successfully.");
