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

export type FeeWaiverApprovedEmailParams = {
  to: string;
  studentName: string;
  courseTitle: string;
  couponCode: string;
  percentage: number;
  validUntil: string;
  feeTypeLabel: string;
  actionUrl: string;
};

export async function sendFeeWaiverApprovedEmail(params: FeeWaiverApprovedEmailParams): Promise<EmailSendResult> {
  const { to, studentName, courseTitle, couponCode, percentage, validUntil, feeTypeLabel, actionUrl } = params;
  const displayName = studentName || "Student";

  const subject = `Fee waiver request approved (${percentage}% OFF) — ${courseTitle}`;
  const preview = `Good news! Your fee waiver request for "${courseTitle}" has been approved. Coupon code: ${couponCode}`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Good news! Your fee waiver request for "${courseTitle}" has been approved by ${BRAND_CONFIG.name}.`,
    "",
    `Coupon Details:`,
    `- Coupon Code: ${couponCode}`,
    `- Discount: ${percentage}% OFF`,
    `- Applies To: ${feeTypeLabel}`,
    `- Valid Until: ${validUntil}`,
    "",
    "You can use this coupon code when enrolling or paying fees for your course:",
    actionUrl,
    "",
    "May Allah make your learning journey blessed for you. Jazakallah Khair!",
    "",
    `${BRAND_CONFIG.name}`,
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Good news! Your fee waiver request for <strong>${courseTitle}</strong> has been <strong style="color:#166534;">approved</strong> by ${BRAND_CONFIG.name}.</p>
    ${EmailInfoCard({
      title: "Fee Waiver Coupon Approved",
      items: [
        { label: "Coupon Code", value: couponCode },
        { label: "Discount", value: `${percentage}% OFF` },
        { label: "Applies To", value: feeTypeLabel },
        { label: "Valid Until", value: validUntil },
      ],
      borderColor: "#16a34a",
      bgColor: "#f0fdf4",
      titleColor: "#166534",
    })}
    <p>Your special coupon code is ready to use. Click below to view your course and claim your discount:</p>
    ${EmailButton({ href: actionUrl, label: "View Course & Claim Waiver", color: "#166534" })}
    ${EmailFallbackLink({ href: actionUrl })}
    <p style="font-size:13px;color:#6b7280;margin-top:16px;">May Allah make this learning journey blessed for you. Jazakallah Khair!</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: actionUrl, priority: "high" });
}

export type FeeWaiverRejectedEmailParams = {
  to: string;
  studentName: string;
  courseTitle: string;
  courseUrl: string;
};

export async function sendFeeWaiverRejectedEmail(params: FeeWaiverRejectedEmailParams): Promise<EmailSendResult> {
  const { to, studentName, courseTitle, courseUrl } = params;
  const displayName = studentName || "Student";

  const subject = `Fee waiver request update — ${courseTitle}`;
  const preview = `Your fee waiver request for "${courseTitle}" was not approved. Please contact us if you have questions.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Your fee waiver request for "${courseTitle}" was not approved by ${BRAND_CONFIG.name} at this time.`,
    "",
    "If you believe this was a mistake or need financial assistance options, please feel free to contact us.",
    "",
    `${BRAND_CONFIG.name}`,
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Your fee waiver request for <strong>${courseTitle}</strong> was not approved by ${BRAND_CONFIG.name} at this time.</p>
    <p>If you believe this was a mistake or need financial assistance options, please feel free to reply to this email or contact our support team.</p>
    ${courseUrl ? EmailButton({ href: courseUrl, label: "View Courses", color: "#3730a3" }) : ""}
    ${courseUrl ? EmailFallbackLink({ href: courseUrl }) : ""}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html });
}
