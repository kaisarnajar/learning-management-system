import fs from 'fs';

let content;

// lib/enrollments.ts
try {
  content = fs.readFileSync('lib/enrollments.ts', 'utf8');
  content = content.replace(/\s*uploadedCertificatePath:\s*string\s*\|\s*null;/g, '');
  fs.writeFileSync('lib/enrollments.ts', content);
} catch(e) { console.error(e) }

// prisma/seed-demo-data.ts
try {
  content = fs.readFileSync('prisma/seed-demo-data.ts', 'utf8');
  content = content.replace(/const uploadedCertificatePath = certificateUploadPath\(enrollmentId\);/g, '');
  content = content.replace(/await writeDemoPdfFile\(uploadedCertificatePath, \[\s*`Course: \$\{courseTitle\}`,\s*`Student: \$\{user\.name\}`,\s*`Status: Completed`,\s*\]\);/g, '');
  content = content.replace(/uploadedCertificatePath,/g, '');
  fs.writeFileSync('prisma/seed-demo-data.ts', content);
} catch(e) { console.error(e) }

// prisma/seed-demo.ts
try {
  content = fs.readFileSync('prisma/seed-demo.ts', 'utf8');
  content = content.replace(/uploadedCertificatePath:\s*true,\s*/g, '');
  fs.writeFileSync('prisma/seed-demo.ts', content);
} catch(e) { console.error(e) }

console.log("Removed uploadedCertificatePath references from lib/enrollments.ts, prisma/seed-demo-data.ts, and prisma/seed-demo.ts");
