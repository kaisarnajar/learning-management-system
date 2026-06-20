import fs from 'fs';

let content;

// app/admin/enrollments/actions.ts
try {
  content = fs.readFileSync('app/admin/enrollments/actions.ts', 'utf8');
  
  // Remove certificate-upload imports
  content = content.replace(/import\s*\{\s*deleteUploadedCertificate,\s*saveUploadedCertificate,\s*validateCertificatePdf,\s*\}\s*from\s*"@\/lib\/certificate-upload";\n/, '');
  
  // Remove uploadCertificate function
  content = content.replace(/export async function uploadCertificate\([\s\S]*?revalidatePath\("\/profile\/courses"\);\n\n\s*return \{ success: true \};\n\}\n/, '');
  
  // Remove deleteUploadedCertificate call
  content = content.replace(/\s*await deleteUploadedCertificate\(enrollment\.uploadedCertificatePath\);/g, '');
  
  fs.writeFileSync('app/admin/enrollments/actions.ts', content);
} catch(e) { console.error(e) }

console.log("Updated app/admin/enrollments/actions.ts");
