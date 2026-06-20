import fs from 'fs';

const updates = [
  {
    file: 'app/admin/courses/page.tsx',
    importSearch: 'import { DeleteCourseButton } from "@/components/admin/DeleteCourseButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteCourse } from "@/app/admin/courses/actions";',
    tagSearch: /<DeleteCourseButton\s+id={([^}]+)}\s+title={([^}]+)}\s+studentCount={([^}]+)}\s*\/>/g,
    tagReplace: `<DeleteActionButton action={deleteCourse.bind(null, $1)} itemName={$2} warningMessage={$3 > 0 ? \`This course can't be deleted because \${$3} student\${$3 === 1 ? "" : "s"} \${$3 === 1 ? "is" : "are"} enrolled.\` : undefined} className="text-sm font-medium text-destructive-text hover:underline" />`
  },
  {
    file: 'app/admin/announcements/page.tsx',
    importSearch: 'import { DeleteSiteAnnouncementButton } from "@/components/admin/DeleteSiteAnnouncementButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteSiteAnnouncement } from "@/app/admin/announcements/actions";',
    tagSearch: /<DeleteSiteAnnouncementButton\s+id={([^}]+)}\s+title={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteSiteAnnouncement.bind(null, $1)} itemName={$2} className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'app/admin/blogs/page.tsx',
    importSearch: 'import { DeleteBlogPostButton } from "@/components/admin/DeleteBlogPostButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteBlogPost } from "@/app/admin/blogs/actions";',
    tagSearch: /<DeleteBlogPostButton\s+id={([^}]+)}\s+title={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteBlogPost.bind(null, $1)} itemName={$2} className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'app/admin/bookstore/page.tsx',
    importSearch: 'import { DeleteBookButton } from "@/components/admin/DeleteBookButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteBook } from "@/app/admin/bookstore/actions";',
    tagSearch: /<DeleteBookButton\s+bookId={([^}]+)}\s+bookTitle={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteBook.bind(null, $1)} itemName={$2} onSuccessRedirect="/admin/bookstore?deleted=1" />'
  },
  {
    file: 'app/admin/contact-inquiries/page.tsx',
    importSearch: 'import { DeleteContactInquiryButton } from "@/components/admin/DeleteContactInquiryButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteContactInquiry } from "@/app/admin/contact-inquiries/actions";',
    tagSearch: /<DeleteContactInquiryButton\s+id={([^}]+)}\s+label={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteContactInquiry.bind(null, $1)} itemName={$2} className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'app/admin/fatwa/page.tsx',
    importSearch: 'import { DeleteFatwaButton } from "@/components/admin/DeleteFatwaButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteFatwa } from "@/app/admin/fatwa/actions";',
    tagSearch: /<DeleteFatwaButton\s+id={([^}]+)}\s+title={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteFatwa.bind(null, $1)} itemName={$2} className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'app/admin/library/page.tsx',
    importSearch: 'import { DeleteLibraryButton } from "@/components/admin/DeleteLibraryButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteLibraryItem } from "@/app/admin/library/actions";',
    tagSearch: /<DeleteLibraryButton\s+id={([^}]+)}\s+label={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteLibraryItem.bind(null, $1)} itemName={$2} className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'app/admin/students/page.tsx',
    importSearch: 'import { DeleteStudentButton } from "@/components/admin/DeleteStudentButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteStudent } from "@/app/admin/students/actions";',
    tagSearch: /<DeleteStudentButton\s+id={([^}]+)}\s+name={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteStudent.bind(null, $1)} itemName={$2} className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'app/admin/teachers/page.tsx',
    importSearch: 'import { DeleteTeacherButton } from "@/components/admin/DeleteTeacherButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteTeacher } from "@/app/admin/teachers/actions";',
    tagSearch: /<DeleteTeacherButton\s+id={([^}]+)}\s+name={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteTeacher.bind(null, $1)} itemName={$2} className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'components/admin/FinanceExpenseTable.tsx',
    importSearch: 'import { DeleteExpenseButton } from "@/components/admin/DeleteExpenseButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteFinanceExpense } from "@/app/admin/finance/actions";',
    tagSearch: /<DeleteExpenseButton\s+id={([^}]+)}\s+returnQuery={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteFinanceExpense.bind(null, $1, $2)} itemName="expense" className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'app/profile/reviews/page.tsx',
    importSearch: 'import { DeleteStudentReviewButton } from "@/components/profile/DeleteStudentReviewButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteStudentReview } from "@/app/profile/reviews/actions";',
    tagSearch: /<DeleteStudentReviewButton\s+id={([^}]+)}\s+courseTitle={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteStudentReview.bind(null, $1)} itemName={`review for ${$2}`} />'
  },
  {
    file: 'app/teacher/(portal)/blogs/page.tsx',
    importSearch: 'import { DeleteTeacherBlogPostButton } from "@/components/teacher/DeleteTeacherBlogPostButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteTeacherBlogPost } from "@/app/teacher/(portal)/blogs/actions";',
    tagSearch: /<DeleteTeacherBlogPostButton\s+id={([^}]+)}\s+title={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteTeacherBlogPost.bind(null, $1)} itemName={$2} className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'app/teacher/(portal)/blogs/[id]/edit/page.tsx',
    importSearch: 'import { DeleteTeacherBlogPostButton } from "@/components/teacher/DeleteTeacherBlogPostButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteTeacherBlogPost } from "@/app/teacher/(portal)/blogs/actions";',
    tagSearch: /<DeleteTeacherBlogPostButton\s+id={([^}]+)}\s+title={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteTeacherBlogPost.bind(null, $1)} itemName={$2} onSuccessRedirect="/teacher/blogs" className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'components/teacher/TeacherCourseAnnouncementCard.tsx',
    importSearch: 'import { DeleteAnnouncementButton } from "@/components/teacher/DeleteAnnouncementButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteTeacherCourseAnnouncement } from "@/app/teacher/(portal)/courses/[id]/announcements/actions";',
    tagSearch: /<DeleteAnnouncementButton\s+id={([^}]+)}\s+courseId={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteTeacherCourseAnnouncement.bind(null, $1, $2)} itemName="announcement" className="text-sm font-medium text-destructive-text hover:underline" />'
  },
  {
    file: 'components/admin/AdminCourseAnnouncementCard.tsx',
    importSearch: 'import { DeleteAnnouncementButton } from "@/components/teacher/DeleteAnnouncementButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteAdminCourseAnnouncement } from "@/app/admin/courses/[id]/announcements/actions";',
    tagSearch: /<DeleteAnnouncementButton\s+id={([^}]+)}\s+courseId={([^}]+)}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteAdminCourseAnnouncement.bind(null, $1, $2)} itemName="announcement" className="text-sm font-medium text-destructive-text hover:underline" />'
  }
];

let success = 0;
for (const update of updates) {
  if (fs.existsSync(update.file)) {
    let content = fs.readFileSync(update.file, 'utf8');
    content = content.replace(update.importSearch, update.importReplace);
    content = content.replace(update.tagSearch, update.tagReplace);
    fs.writeFileSync(update.file, content);
    console.log(`Updated ${update.file}`);
    success++;
  } else {
    console.log(`File not found: ${update.file}`);
  }
}
console.log(`Successfully updated ${success} files.`);
