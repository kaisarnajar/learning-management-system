import fs from 'fs';

let content;

// app/profile/courses/page.tsx
try {
  content = fs.readFileSync('app/profile/courses/page.tsx', 'utf8');
  content = content.replace(/import \{ hasUploadedCertificate \} from "@\/lib\/certificate";/, 'import { canDownloadCertificate } from "@/lib/certificate";');
  content = content.replace(/hasUploadedCertificate\(enrollment\)/g, 'canDownloadCertificate(course.status, enrollment.status)');
  fs.writeFileSync('app/profile/courses/page.tsx', content);
} catch(e) { console.error(e) }

console.log("Updated app/profile/courses/page.tsx");
