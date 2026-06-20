import fs from 'fs';

let content;

// 1. contact-inquiries
content = fs.readFileSync('app/admin/contact-inquiries/page.tsx', 'utf8');
content = content.replace(
  'import { deleteContactInquiry } from "@/app/admin/contact-inquiries/actions";',
  'import { deleteContactInquiryById as deleteContactInquiry } from "@/app/admin/contact-inquiries/actions";'
);
content = content.replace(
  /<DeleteContactInquiryButton[\s\S]*?\/>/,
  `<DeleteActionButton action={deleteContactInquiry.bind(null, inquiry.id)} itemName={\`\${inquiry.name} (\${inquiry.email})\`} className="text-sm font-medium text-destructive-text hover:underline" />`
);
fs.writeFileSync('app/admin/contact-inquiries/page.tsx', content);

// 2. fatwa
content = fs.readFileSync('app/admin/fatwa/page.tsx', 'utf8');
content = content.replace(
  'import { deleteFatwa } from "@/app/admin/fatwa/actions";',
  'import { deleteFatwaQuestion as deleteFatwa } from "@/app/admin/fatwa/actions";'
);
fs.writeFileSync('app/admin/fatwa/page.tsx', content);

// 3. review-approvals
content = fs.readFileSync('app/admin/review-approvals/[id]/page.tsx', 'utf8');
content = content.replace(
  'const result = await approveStudentReview(review.id, "/admin/review-approvals");',
  'const result = await approveStudentReview(review.id);'
);
content = content.replace(
  'const result = await rejectStudentReview(review.id, "/admin/review-approvals");',
  'const result = await rejectStudentReview(review.id);'
);
fs.writeFileSync('app/admin/review-approvals/[id]/page.tsx', content);

content = fs.readFileSync('app/admin/review-approvals/page.tsx', 'utf8');
content = content.replace(
  /const result = await approveStudentReview\(reviewId\);/g,
  'const result = await approveStudentReview(reviewId);'
);
content = content.replace(
  /const result = await rejectStudentReview\(reviewId\);/g,
  'const result = await rejectStudentReview(reviewId);'
);
fs.writeFileSync('app/admin/review-approvals/page.tsx', content);

// 4. students/page.tsx
content = fs.readFileSync('app/admin/students/page.tsx', 'utf8');
content = content.replace(
  'import { deleteStudent } from "@/app/admin/students/actions";',
  'import { deleteStudentUser as deleteStudent } from "@/app/admin/students/actions";'
);
content = content.replace(
  /<DeleteStudentButton[\s\S]*?\/>/,
  `<DeleteActionButton action={deleteStudent.bind(null, student.id)} itemName={student.name ?? student.email} className="text-sm font-medium text-destructive-text hover:underline" />`
);
fs.writeFileSync('app/admin/students/page.tsx', content);

// 5. teachers/page.tsx
content = fs.readFileSync('app/admin/teachers/page.tsx', 'utf8');
content = content.replace(
  /<DeleteTeacherButton[\s\S]*?\/>/,
  `<DeleteActionButton action={deleteTeacher.bind(null, teacher.id)} itemName={teacher.name ?? teacher.email} className="text-sm font-medium text-destructive-text hover:underline" />`
);
fs.writeFileSync('app/admin/teachers/page.tsx', content);

// 6. profile/reviews/page.tsx
content = fs.readFileSync('app/profile/reviews/page.tsx', 'utf8');
content = content.replace(
  /<DeleteStudentReviewButton[\s\S]*?\/>/,
  `<DeleteActionButton action={deleteStudentReview.bind(null, review.id)} itemName={\`review for \${review.course.title}\`} className="text-sm font-medium text-destructive-text hover:underline" />`
);
fs.writeFileSync('app/profile/reviews/page.tsx', content);

// 7. teacher/blogs/page.tsx
content = fs.readFileSync('app/teacher/(portal)/blogs/page.tsx', 'utf8');
content = content.replace(
  /<DeleteTeacherBlogPostButton[\s\S]*?\/>/,
  `<DeleteActionButton action={deleteTeacherBlogPost.bind(null, post.id)} itemName={post.title} className="text-sm font-medium text-destructive-text hover:underline" />`
);
fs.writeFileSync('app/teacher/(portal)/blogs/page.tsx', content);

console.log("Fixes applied successfully.");
