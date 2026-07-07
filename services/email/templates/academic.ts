import { deliverMail, EmailSendResult } from "../core";
import { buildHtmlEmail } from "../layout";
import { EmailGreeting, EmailInfoCard } from "../components";
import { BRAND_CONFIG } from "@/config/brand";

export type CertificateEmailParams = {
  to: string;
  studentName: string;
  courseTitle: string;
  certificateNumber: string;
  certificateType: "APPRECIATION" | "COMPLETION";
  pdfBuffer: Buffer;
  pdfFilename: string;
};

export async function sendCertificateEmail(params: CertificateEmailParams): Promise<EmailSendResult> {
  const { to, studentName, courseTitle, certificateNumber, certificateType, pdfBuffer, pdfFilename } = params;
  const displayName = studentName || "Student";
  const isCompletion = certificateType === "COMPLETION";
  const certLabel = isCompletion ? "Certificate of Completion" : "Certificate of Appreciation";

  const subject = `${certLabel} — ${courseTitle}`;
  const preview = isCompletion
    ? `Congratulations! Your Certificate of Completion for "${courseTitle}" is attached.`
    : `Your Certificate of Appreciation for "${courseTitle}" is attached.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    isCompletion
      ? `Congratulations on successfully completing "${courseTitle}" at ${BRAND_CONFIG.name}!`
      : `Thank you for your dedication and effort in "${courseTitle}" at ${BRAND_CONFIG.name}!`,
    "",
    `Your ${certLabel} (No. ${certificateNumber}) is attached to this email as a PDF.`,
    "",
    "We pray this certificate is a blessing and a recognition of your sincere efforts in seeking Islamic knowledge.",
    "",
    "Jazakallah Khair,",
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    ${
      isCompletion
        ? `<p>Congratulations on successfully completing <strong>${courseTitle}</strong> at ${BRAND_CONFIG.name}! May Allah bless your efforts and make this knowledge a source of benefit for you and others.</p>`
        : `<p>Thank you for your dedication and effort in <strong>${courseTitle}</strong> at ${BRAND_CONFIG.name}. Your commitment to Islamic education is truly appreciated.</p>`
    }
    ${EmailInfoCard({
      title: certLabel,
      items: [
        { label: "Course", value: courseTitle },
        { label: "Certificate No", value: certificateNumber },
      ],
      borderColor: "#d4a017",
      bgColor: "#fef9e7",
      titleColor: "#92400e",
    })}
    <p>Your <strong>${certLabel}</strong> is <strong>attached to this email</strong> as a PDF. Please download and keep it for your records.</p>
    <p style="font-size:13px;color:#6b7280;">We pray this is a source of barakah and motivation to continue on the path of knowledge. Jazakallah Khair!</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview,
    priority: "high",
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export type IdCardEmailParams = {
  to: string;
  studentName: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
};

export async function sendIdCardEmail(params: IdCardEmailParams): Promise<EmailSendResult> {
  const { to, studentName, pdfBuffer, pdfFilename } = params;
  const displayName = studentName || "Student";

  const subject = `Your Digital ID Card — ${BRAND_CONFIG.name}`;
  const preview = `Your official student ID card is attached to this email.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    "Your official student Digital ID Card has been generated.",
    "",
    "It is attached to this email as a PDF.",
    "",
    "Please download and keep it for your records.",
    "",
    "Jazakallah Khair,",
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Your official student <strong>Digital ID Card</strong> has been generated.</p>
    ${EmailInfoCard({
      title: "Digital ID Card Issued",
      items: [{ label: "Status", value: "Generated successfully" }],
      borderColor: "#0284c7",
      bgColor: "#f0f9ff",
      titleColor: "#0369a1",
    })}
    <p>Your ID card is <strong>attached to this email</strong> as a PDF. Please download and keep it for your records.</p>
    <p style="font-size:13px;color:#6b7280;">If you have any questions, please reply to this email.</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview,
    priority: "high",
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export type GradeCardEmailParams = {
  to: string;
  studentName: string;
  courseTitle: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
};

export async function sendGradeCardEmail(params: GradeCardEmailParams): Promise<EmailSendResult> {
  const { to, studentName, courseTitle, pdfBuffer, pdfFilename } = params;
  const displayName = studentName || "Student";

  const subject = `Academic Test Report — ${courseTitle}`;
  const preview = `Your official academic test report for ${courseTitle} is attached.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Your academic test report (Grade Card) for the course "${courseTitle}" has been generated.`,
    "",
    "It is attached to this email as a PDF document.",
    "",
    "Please download and review it for your academic records.",
    "",
    "Jazakallah Khair,",
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Your academic test report (Grade Card) for the course <strong>${courseTitle}</strong> has been generated.</p>
    ${EmailInfoCard({
      title: "Grade Card Issued",
      items: [{ label: "Status", value: "Generated successfully" }],
      borderColor: "#0284c7",
      bgColor: "#f0f9ff",
      titleColor: "#0369a1",
    })}
    <p>The PDF document is <strong>attached to this email</strong>. Please download and keep it for your records.</p>
    <p style="font-size:13px;color:#6b7280;">If you have any questions, please reply to this email.</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview,
    priority: "high",
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

export type AttendanceCardEmailParams = {
  to: string;
  studentName: string;
  courseTitle: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
};

export async function sendAttendanceCardEmail(params: AttendanceCardEmailParams): Promise<EmailSendResult> {
  const { to, studentName, courseTitle, pdfBuffer, pdfFilename } = params;
  const displayName = studentName || "Student";

  const subject = `Academic Attendance Report — ${courseTitle}`;
  const preview = `Your official academic attendance report for ${courseTitle} is attached.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Your academic attendance report (Attendance Card) for the course "${courseTitle}" has been generated.`,
    "",
    "It is attached to this email as a PDF document.",
    "",
    "Please download and review it for your academic records.",
    "",
    "Jazakallah Khair,",
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Your academic attendance report (Attendance Card) for the course <strong>${courseTitle}</strong> has been generated.</p>
    ${EmailInfoCard({
      title: "Attendance Card Issued",
      items: [{ label: "Status", value: "Generated successfully" }],
      borderColor: "#0284c7",
      bgColor: "#f0f9ff",
      titleColor: "#0369a1",
    })}
    <p>The PDF document is <strong>attached to this email</strong>. Please download and keep it for your records.</p>
    <p style="font-size:13px;color:#6b7280;">If you have any questions, please reply to this email.</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview,
    priority: "high",
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}
