import type { Enrollment } from "@prisma/client";
import { BRAND_CONFIG } from "@/config/brand";
import { getCourseById } from "@/services/courses";
import { generateCertificatePdf, getCertificateFilename } from "@/services/certificate";
import { prepareReceiptData, type ReceiptRecordInput } from "@/services/payment-receipt";
import { generatePdfFromHtml, wrapHtmlForPdf } from "@/services/pdf-generator";
import { certificateTypeOf } from "@/services/status-compat";
import { deletePrivateObject, getPrivateObject, putPrivateObject } from "@/services/storage";
import { renderReceiptToHtml } from "@/utils/receipt-html";
import { prisma } from "@/utils/prisma";

/**
 * Issued documents are rendered once and kept in private storage; downloads
 * and emails reuse the stored file and only fall back to Chromium when the
 * file is missing (older records, a failed store) or the record no longer
 * matches what was rendered (voided receipt). Grade/attendance/ID cards keep
 * rendering on demand: they change as marks and attendance are entered.
 */

export const RECEIPT_PDF_PREFIX = "private/documents/receipts/";
export const CERTIFICATE_PDF_PREFIX = "private/documents/certificates/";

export function receiptPdfKey(paymentRecordId: string): string {
  return `${RECEIPT_PDF_PREFIX}${paymentRecordId}.pdf`;
}

export function certificatePdfKey(enrollmentId: string): string {
  return `${CERTIFICATE_PDF_PREFIX}${enrollmentId}.pdf`;
}

// ---------------------------------------------------------------------------
// Receipts
// ---------------------------------------------------------------------------

type ReceiptRecord = ReceiptRecordInput & {
  invoiceNumber: string | null;
  receiptIncludesGst: boolean | null;
  receiptPdfKey?: string | null;
  voidedAt?: Date | null;
};

async function receiptCourseTitle(record: { courseId?: string | null }): Promise<string> {
  const course = record.courseId ? await getCourseById(record.courseId) : null;
  return course?.title ?? BRAND_CONFIG.name;
}

/** Renders the receipt exactly as issued (stored invoice number and GST split). */
export async function renderReceiptPdf(record: ReceiptRecord): Promise<{ pdf: Buffer; filename: string }> {
  const courseTitle = await receiptCourseTitle(record);
  const { receiptData, filename } = await prepareReceiptData(record, courseTitle, {
    invoiceNumberOverride: record.invoiceNumber ?? undefined,
    includeGstOverride: record.receiptIncludesGst ?? false,
    baseAmountPaiseOverride: record.receiptFeeAmountPaise ?? record.amountInrPaise,
    gstAmountPaiseOverride: record.receiptGstAmountPaise ?? 0,
  });
  const html = await wrapHtmlForPdf(renderReceiptToHtml(receiptData), { landscape: false });
  const pdf = await generatePdfFromHtml(html, { format: "A4", landscape: false });
  return { pdf, filename };
}

/** Renders and stores the receipt PDF; returns false (and logs) when storing fails. */
export async function storeReceiptPdf(record: ReceiptRecord): Promise<boolean> {
  try {
    const { pdf } = await renderReceiptPdf(record);
    const key = receiptPdfKey(record.id);
    await putPrivateObject(key, pdf, "application/pdf");
    await prisma.paymentRecord.update({ where: { id: record.id }, data: { receiptPdfKey: key } });
    return true;
  } catch (error) {
    console.error("[documents] Could not store receipt PDF for", record.id, error);
    return false;
  }
}

/**
 * The receipt PDF: the stored file when the record has one and is not voided,
 * otherwise a fresh render (stored again when possible).
 */
export async function getReceiptPdf(record: ReceiptRecord): Promise<{ pdf: Buffer; filename: string; fromStore: boolean }> {
  if (record.receiptPdfKey && !record.voidedAt) {
    const stored = await getPrivateObject(record.receiptPdfKey);
    if (stored) {
      const { filename } = await prepareReceiptData(record, await receiptCourseTitle(record), {
        invoiceNumberOverride: record.invoiceNumber ?? undefined,
      });
      return { pdf: stored, filename, fromStore: true };
    }
  }
  const rendered = await renderReceiptPdf(record);
  if (!record.voidedAt) {
    // Best effort: keep the fresh render for the next download.
    try {
      const key = receiptPdfKey(record.id);
      await putPrivateObject(key, rendered.pdf, "application/pdf");
      await prisma.paymentRecord.update({ where: { id: record.id }, data: { receiptPdfKey: key } });
    } catch (error) {
      console.error("[documents] Could not store receipt PDF for", record.id, error);
    }
  }
  return { ...rendered, fromStore: false };
}

export async function deleteStoredReceiptPdf(record: { id: string; receiptPdfKey?: string | null }): Promise<void> {
  await deletePrivateObject(record.receiptPdfKey ?? receiptPdfKey(record.id));
}

// ---------------------------------------------------------------------------
// Certificates
// ---------------------------------------------------------------------------

type CertificateEnrollment = Pick<
  Enrollment,
  "id" | "courseId" | "certificateGeneratedAt" | "certificateNumber" | "certificateType" | "certificateGrade"
> & {
  certificateTypeEnum?: Enrollment["certificateTypeEnum"];
  certificatePdfKey?: string | null;
  user: { name: string | null; address: string | null };
};

function certificateIssueDate(enrollment: CertificateEnrollment): string {
  return (enrollment.certificateGeneratedAt ?? new Date()).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function renderCertificatePdf(
  enrollment: CertificateEnrollment,
  courseTitle: string,
): Promise<{ pdf: Buffer; filename: string }> {
  if (!enrollment.certificateNumber) throw new Error("Certificate has not been generated.");
  const pdf = await generateCertificatePdf({
    studentName: enrollment.user.name || "Student",
    studentAddress: enrollment.user.address,
    courseTitle,
    issueDate: certificateIssueDate(enrollment),
    certificateNumber: enrollment.certificateNumber,
    certificateType: certificateTypeOf(enrollment) ?? "COMPLETION",
    certificateGrade: enrollment.certificateGrade,
  });
  return { pdf, filename: getCertificateFilename(courseTitle, enrollment.id) };
}

/** Renders and stores the certificate PDF; returns false (and logs) when storing fails. */
export async function storeCertificatePdf(enrollment: CertificateEnrollment, courseTitle: string): Promise<boolean> {
  try {
    const { pdf } = await renderCertificatePdf(enrollment, courseTitle);
    const key = certificatePdfKey(enrollment.id);
    await putPrivateObject(key, pdf, "application/pdf");
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { certificatePdfKey: key } });
    return true;
  } catch (error) {
    console.error("[documents] Could not store certificate PDF for", enrollment.id, error);
    return false;
  }
}

/** The certificate PDF: the stored file when there is one, otherwise a fresh render (stored again when possible). */
export async function getCertificatePdf(
  enrollment: CertificateEnrollment,
  courseTitle: string,
): Promise<{ pdf: Buffer; filename: string; fromStore: boolean }> {
  if (enrollment.certificatePdfKey) {
    const stored = await getPrivateObject(enrollment.certificatePdfKey);
    if (stored) {
      return { pdf: stored, filename: getCertificateFilename(courseTitle, enrollment.id), fromStore: true };
    }
  }
  const rendered = await renderCertificatePdf(enrollment, courseTitle);
  try {
    const key = certificatePdfKey(enrollment.id);
    await putPrivateObject(key, rendered.pdf, "application/pdf");
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { certificatePdfKey: key } });
  } catch (error) {
    console.error("[documents] Could not store certificate PDF for", enrollment.id, error);
  }
  return { ...rendered, fromStore: false };
}

export async function deleteStoredCertificatePdf(enrollment: { id: string; certificatePdfKey?: string | null }): Promise<void> {
  await deletePrivateObject(enrollment.certificatePdfKey ?? certificatePdfKey(enrollment.id));
}
