import { deliverMail, EmailSendResult, NotificationEmailBaseParams } from "../core";
import { buildHtmlEmail } from "../layout";
import { EmailGreeting, EmailButton, EmailFallbackLink, EmailInfoCard } from "../components";
import { BRAND_CONFIG } from "@/config/brand";

export async function sendPaymentApprovedEmail(
  params: NotificationEmailBaseParams & { courseTitle: string; paymentUrl: string },
) {
  const { to, studentName, courseTitle, paymentUrl } = params;
  const displayName = studentName || "Student";
  const subject = `Payment approved — ${courseTitle}`;
  const preview = `Congratulations! Your payment for "${courseTitle}" has been verified.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Your payment for "${courseTitle}" has been successfully verified by ${BRAND_CONFIG.name}.`,
    "",
    "You can view your payment details and download your receipt here:",
    paymentUrl,
    "",
    "Jazakallah Khair,",
    `${BRAND_CONFIG.name}`,
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Your payment for <strong>${courseTitle}</strong> has been <strong style="color:#166534;">successfully verified</strong>. Jazakallah Khair!</p>
    ${EmailButton({ href: paymentUrl, label: "View Payment & Receipt", color: "#166534" })}
    ${EmailFallbackLink({ href: paymentUrl })}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: paymentUrl, priority: "high" });
}

export type PaymentDeclinedEmailParams = {
  to: string;
  studentName: string;
  courseTitle: string;
  paymentUrl: string;
};

export async function sendPaymentDeclinedEmail(params: PaymentDeclinedEmailParams): Promise<EmailSendResult> {
  const { to, studentName, courseTitle, paymentUrl } = params;
  const displayName = studentName || "Student";

  const subject = `Action required: resubmit payment — ${courseTitle}`;
  const preview = `We could not verify your payment for "${courseTitle}". Please resubmit your payment details.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `We could not verify your registration payment for "${courseTitle}" at ${BRAND_CONFIG.name}.`,
    "",
    "Please submit your payment details again (UPI reference or bank transfer proof) using the link below:",
    paymentUrl,
    "",
    "Once we verify your payment, your enrollment will be activated.",
    "",
    "If you believe this was a mistake, please reply to this email or contact the academy.",
    "",
    `${BRAND_CONFIG.name}`,
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>We could not verify your registration payment for <strong>${courseTitle}</strong> at ${BRAND_CONFIG.name}.</p>
    <p>Please submit your payment details again (UPI reference or bank transfer proof):</p>
    ${EmailButton({ href: paymentUrl, label: "Resubmit Payment", color: "#b91c1c" })}
    ${EmailFallbackLink({ href: paymentUrl })}
    <p>Once we verify your payment, your enrollment will be activated.</p>
    <p style="font-size:13px;color:#6b7280;">If you believe this was a mistake, please reply to this email.</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: paymentUrl, priority: "high" });
}

export type ReceiptEmailParams = {
  to: string;
  studentName: string;
  courseTitle: string;
  invoiceNumber: string;
  amountStr: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
};

export async function sendReceiptEmail(params: ReceiptEmailParams): Promise<EmailSendResult> {
  const { to, studentName, courseTitle, invoiceNumber, amountStr, pdfBuffer, pdfFilename } = params;
  const displayName = studentName || "Student";

  const subject = `Payment Receipt — ${invoiceNumber}`;
  const preview = `Your payment receipt for "${courseTitle}" is attached. Amount paid: ${amountStr}.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Thank you for your payment for "${courseTitle}" at ${BRAND_CONFIG.name}.`,
    "",
    `Your payment receipt (${invoiceNumber}) for ${amountStr} is attached to this email as a PDF.`,
    "",
    "Please keep it for your records.",
    "",
    "Jazakallah Khair,",
    `${BRAND_CONFIG.name}`,
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Thank you for your payment for <strong>${courseTitle}</strong> at ${BRAND_CONFIG.name}.</p>
    ${EmailInfoCard({
      title: "Payment Confirmed",
      items: [
        { label: "Invoice No", value: invoiceNumber },
        { label: "Amount Paid", value: amountStr },
      ],
      borderColor: "#16a34a",
      bgColor: "#f0fdf4",
      titleColor: "#166534",
    })}
    <p>Your official payment receipt is <strong>attached to this email</strong> as a PDF. Please keep it for your records.</p>
    <p style="font-size:13px;color:#6b7280;">If you have any questions, please reply to this email or contact the academy.</p>
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
