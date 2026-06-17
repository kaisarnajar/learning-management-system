import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const MAX_CERTIFICATE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPE = "application/pdf";

export function validateCertificatePdf(file: File | null): { error?: string } {
  if (!file || file.size === 0) {
    return { error: "Choose a PDF certificate file to upload." };
  }

  if (file.type !== ALLOWED_TYPE) {
    return { error: "Certificate must be a PDF file." };
  }

  if (file.size > MAX_CERTIFICATE_BYTES) {
    return { error: "Certificate PDF must be 10 MB or smaller." };
  }

  return {};
}

function certificateDir() {
  return path.join(process.cwd(), "public", "uploads", "certificates");
}

export function certificateUploadPath(enrollmentId: string) {
  return `/uploads/certificates/${enrollmentId}.pdf`;
}

export async function deleteUploadedCertificate(publicPath: string | null) {
  if (!publicPath?.startsWith("/uploads/certificates/")) return;

  const absolute = path.join(process.cwd(), "public", publicPath.replace(/^\//, ""));
  try {
    await unlink(absolute);
  } catch (error) {
    console.error("Caught error:", error);

    }
}

export async function saveUploadedCertificate(enrollmentId: string, file: File): Promise<string> {
  const publicPath = certificateUploadPath(enrollmentId);
  const dir = certificateDir();
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, `${enrollmentId}.pdf`), buffer);

  return publicPath;
}
