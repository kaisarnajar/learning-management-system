import fs from "fs/promises";
import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { getAcademySettings } from "@/lib/academy-settings";
import { renderCertificateToHtml } from "@/lib/certificate-html";
import { generatePdfFromHtml } from "@/lib/pdf-generator";
import { ASSET_LOCAL_PATHS } from "@/config/assets";


export function getCertificateFilename(courseTitle: string, enrollmentId: string): string {
  const slug = courseTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `certificate-${slug || "course"}-${enrollmentId.slice(0, 8)}.pdf`;
}

export function canDownloadCertificate(courseStatus: string, enrollmentStatus: string): boolean {
  return courseStatus === "COMPLETED" && enrollmentStatus === "completed";
}

export type CertificatePdfParams = {
  studentName: string;
  studentAddress: string | null;
  courseTitle: string;
  issueDate: string;
  certificateNumber: string;
  certificateType: "APPRECIATION" | "COMPLETION";
  certificateGrade: number | null;
  startDelayMs?: number;
};

export async function generateCertificatePdf(params: CertificatePdfParams): Promise<Buffer> {
  const [socialLinks, academySettings] = await Promise.all([
    getSocialLinksSettings(),
    getAcademySettings(),
  ]);

  let base64Logo = "";
  let base64Signature = "";
  let base64Stamp = "";
  try {
    const logoPath = ASSET_LOCAL_PATHS.logo;
    const sigPath = ASSET_LOCAL_PATHS.signature;
    const stampPath = ASSET_LOCAL_PATHS.stamp;
    const [logoBytes, sigBytes, stampBytes] = await Promise.all([
      fs.readFile(logoPath).catch(() => null),
      fs.readFile(sigPath).catch(() => null),
      fs.readFile(stampPath).catch(() => null),
    ]);
    if (logoBytes) base64Logo = `data:image/png;base64,${logoBytes.toString("base64")}`;
    if (sigBytes) base64Signature = `data:image/png;base64,${sigBytes.toString("base64")}`;
    if (stampBytes) base64Stamp = `data:image/png;base64,${stampBytes.toString("base64")}`;
  } catch (e) {
    console.error("[certificate-pdf] Could not load images:", e);
  }

  const certData = {
    studentName: params.studentName,
    address: params.studentAddress || "N/A",
    courseName: params.courseTitle,
    issueDate: params.issueDate,
    signatureUrl: base64Signature,
    sealUrl: base64Logo,
    stampUrl: base64Stamp,
    academyName: academySettings.academyName,
    academyEmail: socialLinks.contactEmail || "",
    academyPhone: formatWhatsAppForDisplay(socialLinks.whatsappNumber) || "",
    certificateNumber: params.certificateNumber,
    certificateType: params.certificateType,
    certificateGrade: params.certificateGrade,
  };

  const componentHtml = renderCertificateToHtml(certData);
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:wght@400;600;700&display=swap" rel="stylesheet" />
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; } }
        @page { size: A4 landscape; margin: 0; }
        body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background: white !important; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        img { max-width: 100%; height: auto; }
      </style>
    </head>
    <body>${componentHtml}</body>
    </html>
  `;

  return await generatePdfFromHtml(fullHtml, {
    format: "A4",
    landscape: true,
    startDelayMs: params.startDelayMs ?? 0,
  });
}
