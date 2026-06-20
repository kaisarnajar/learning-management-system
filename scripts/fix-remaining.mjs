import fs from 'fs';

const updates = [
  {
    file: 'app/admin/courses/[id]/students/page.tsx',
    importSearch: 'import { RemoveEnrollmentButton } from "@/components/admin/RemoveEnrollmentButton";',
    importReplace: 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";',
    tagSearch: /<RemoveEnrollmentButton\s+enrollmentId={enrollment\.id}\s+courseId={course\.id}\s+studentLabel={enrollment\.user\.name \?\? enrollment\.user\.email}\s*\/>/g,
    tagReplace: '<ConfirmationModal title="Remove Enrollment" description={`Remove ${enrollment.user.name ?? enrollment.user.email} from this course? Their account will not be deleted; they can enroll again later.`} actionLabel="Remove" variant="destructive" onConfirm={async () => { const result = await removeEnrollmentFromCourse(enrollment.id, course.id); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="text-sm font-medium text-destructive-text hover:underline">Remove</button>} />'
  },
  {
    file: 'app/admin/students/[id]/page.tsx',
    importSearch: 'import { RemoveEnrollmentButton } from "@/components/admin/RemoveEnrollmentButton";',
    importReplace: 'import { ConfirmationModal } from "@/components/shared/ConfirmationModal";\nimport { removeEnrollmentFromCourse } from "@/app/admin/enrollments/actions";',
    tagSearch: /<RemoveEnrollmentButton\s+enrollmentId={enrollment\.id}\s+courseId={enrollment\.courseId}\s+studentLabel={student\.name \?\? student\.email}\s*\/>/g,
    tagReplace: '<ConfirmationModal title="Remove Enrollment" description={`Remove ${student.name ?? student.email} from this course? Their account will not be deleted; they can enroll again later.`} actionLabel="Remove" variant="destructive" onConfirm={async () => { const result = await removeEnrollmentFromCourse(enrollment.id, enrollment.courseId); if (result?.error) window.alert(result.error); }} trigger={<button type="button" className="text-sm font-medium text-destructive-text hover:underline">Remove</button>} />'
  },
  {
    file: 'app/admin/daily-inspiration/page.tsx',
    importSearch: 'import { DeleteDailyInspirationButton } from "@/components/admin/DeleteDailyInspirationButton";',
    importReplace: 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { deleteDailyInspiration } from "@/app/admin/daily-inspiration/actions";',
    tagSearch: /<DeleteDailyInspirationButton\s+id={item\.id}\s+kind={item\.kind}\s*\/>/g,
    tagReplace: '<DeleteActionButton action={deleteDailyInspiration.bind(null, item.id)} itemName={item.kind} className="text-sm font-medium text-destructive-text hover:underline" />'
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
console.log(`Successfully updated ${success} entries.`);
