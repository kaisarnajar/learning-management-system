import fs from 'fs';

let c = fs.readFileSync('app/admin/students/[id]/page.tsx', 'utf8');

c = c.replace(/import \{ ConfirmationModal \} from "@\/components\/shared\/ConfirmationModal";\n/, '');
c = c.replace(/import \{ removeEnrollmentFromCourse \} from "@\/app\/admin\/enrollments\/actions";\n/, '');

c = c.replace(/import \{ DeleteActionButton \} from "@\/components\/shared\/DeleteActionButton";/, 'import { DeleteActionButton } from "@/components/shared/DeleteActionButton";\nimport { RemoveStudentEnrollmentAction } from "@/components/admin/RemoveStudentEnrollmentAction";');

const actionRegex = /<ConfirmationModal title="Remove Enrollment"[\s\S]*?Remove<\/button>} \/>/;
c = c.replace(actionRegex, '<RemoveStudentEnrollmentAction studentNameOrEmail={student.name ?? student.email} enrollmentId={enrollment.id} courseId={enrollment.courseId} />');

fs.writeFileSync('app/admin/students/[id]/page.tsx', c);
