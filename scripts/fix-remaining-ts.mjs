import fs from 'fs';

let c;
// 1. app/admin/courses/[id]/students/page.tsx
try {
  c = fs.readFileSync('app/admin/courses/[id]/students/page.tsx', 'utf8');
  c = c.replace(/import \{ UploadCertificateButton \} from "@\/components\/admin\/UploadCertificateButton";\n/, '');
  fs.writeFileSync('app/admin/courses/[id]/students/page.tsx', c);
} catch(e) { console.error(e) }

// 2. app/admin/enrollments/actions.ts
try {
  c = fs.readFileSync('app/admin/enrollments/actions.ts', 'utf8');
  c = c.replace(/export async function uploadCertificate\([\s\S]*?return \{ success: true \};\n\}\n/, '');
  c = c.replace(/import\s*\{\s*deleteUploadedCertificate,\s*saveUploadedCertificate,\s*validateCertificatePdf,\s*\}\s*from\s*"@\/lib\/certificate-upload";\n/, '');
  c = c.replace(/\s*await deleteUploadedCertificate\(enrollment\.uploadedCertificatePath\);\n/, '');
  fs.writeFileSync('app/admin/enrollments/actions.ts', c);
} catch(e) { console.error(e) }

// 3. prisma/seed-demo-data.ts
try {
  c = fs.readFileSync('prisma/seed-demo-data.ts', 'utf8');
  c = c.replace(/import \{ certificateUploadPath \} from "\.\.\/lib\/certificate-upload";\n/, '');
  c = c.replace(/await writeDemoPdfFile\([\s\S]*?\);\n/g, '');
  fs.writeFileSync('prisma/seed-demo-data.ts', c);
} catch(e) { console.error(e) }

console.log('Fixes applied');
