import { getSocialLinksSettings, formatWhatsAppForDisplay } from "@/lib/social-links";
import { getAcademySettings } from "@/lib/academy-settings";
import { renderCertificateToHtml } from "@/lib/certificate-html";
import { generatePdfFromHtml, loadStandardPdfAssets, wrapHtmlForPdf } from "@/lib/pdf-generator";


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

  const { base64Logo, base64Signature, base64Stamp } = await loadStandardPdfAssets();

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
  const fullHtml = wrapHtmlForPdf(componentHtml, { landscape: true });

  return await generatePdfFromHtml(fullHtml, {
    format: "A4",
    landscape: true,
    startDelayMs: params.startDelayMs ?? 0,
  });
}
