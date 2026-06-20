import fs from 'fs';

let content;

// app/admin/courses/[id]/students/page.tsx
try {
  content = fs.readFileSync('app/admin/courses/[id]/students/page.tsx', 'utf8');
  content = content.replace(/import \{ UploadCertificateButton \} from "@\/components\/admin\/UploadCertificateButton";\n/, '');
  content = content.replace(/\{isCompletedCourse && \(\s*<>\s*\{enrollment\.uploadedCertificatePath && \(\s*<ViewCertificateButton enrollmentId=\{enrollment\.id\} \/>\s*\)\}\s*<UploadCertificateButton\s*enrollmentId=\{enrollment\.id\}\s*courseId=\{id\}\s*hasCertificate=\{Boolean\(enrollment\.uploadedCertificatePath\)\}\s*\/>\s*<\/>\s*\)\}/, 
    '{isCompletedCourse && (\n                          <ViewCertificateButton enrollmentId={enrollment.id} />\n                        )}'
  );
  fs.writeFileSync('app/admin/courses/[id]/students/page.tsx', content);
} catch(e) { console.error(e) }

console.log("Updated app/admin/courses/[id]/students/page.tsx");
