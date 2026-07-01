import nodemailer from "nodemailer";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailSendResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

// ---------------------------------------------------------------------------
// Configuration helpers
// ---------------------------------------------------------------------------

function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function stripEnvQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function getSmtpPassword(): string {
  // Gmail app passwords are often copied with spaces — remove them.
  return (process.env.SMTP_PASS ?? "").replace(/\s/g, "");
}

/**
 * Returns just the bare email address extracted from EMAIL_FROM / SMTP_USER.
 * e.g. "Darse Quran Academy <admin@gmail.com>" → "admin@gmail.com"
 */
function getSenderEmail(): string {
  const raw =
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "noreply@darsequranacademy.com";
  const stripped = stripEnvQuotes(raw);
  const match = stripped.match(/<([^>]+)>/);
  return match ? match[1].trim() : stripped;
}

/**
 * Returns a "Display Name <email>" formatted From address.
 * If EMAIL_FROM already contains a display name it is preserved.
 */
function getFromAddress(): string {
  const raw =
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "noreply@darsequranacademy.com";
  const stripped = stripEnvQuotes(raw);
  if (stripped.includes("<")) return stripped; // already has display name
  return `Darse Quran Academy <${stripped}>`;
}

/**
 * Returns the Reply-To address.
 * Prefers EMAIL_REPLY_TO, then falls back to the sender email.
 *
 * IMPORTANT (Gmail personal): with @gmail.com, DKIM is signed by Google for
 * gmail.com and SPF passes for Gmail servers automatically — no DNS action
 * required on your part. The "From:" display name can be set to anything via
 * EMAIL_FROM in your .env. For best deliverability, the SMTP_USER and
 * EMAIL_FROM address should be the same @gmail.com account.
 */
function getReplyTo(): string {
  const raw = process.env.EMAIL_REPLY_TO?.trim();
  if (raw) return stripEnvQuotes(raw);
  return getSenderEmail();
}

/**
 * Generates an RFC 2822-compliant Message-ID.
 * Format: <hex@domain>
 */
function generateMessageId(): string {
  const domain = getSenderEmail().split("@")[1] || "darsequranacademy.com";
  const unique = randomBytes(16).toString("hex");
  return `<${unique}@${domain}>`;
}

// ---------------------------------------------------------------------------
// SMTP transport
// ---------------------------------------------------------------------------

function createTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim(),
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: getSmtpPassword(),
    },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
  });
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Wraps inner body HTML in a full RFC-compliant email HTML document:
 * - Proper DOCTYPE, <html>, <head>, <meta charset>, viewport
 * - Branded header bar
 * - Content card
 * - Consistent footer with transactional disclosure
 * - Hidden preview-text <span> (controls the email client's snippet text)
 */
function buildHtmlEmail({
  previewText,
  bodyHtml,
  unsubscribeUrl,
}: {
  previewText: string;
  bodyHtml: string;
  unsubscribeUrl?: string;
}): string {
  const footerExtra = unsubscribeUrl
    ? `<p style="margin:8px 0 0 0;"><a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;font-size:11px;">Manage notification preferences</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title>Darse Quran Academy</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!--[if mso | IE]><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
  <!-- Hidden preview text — controls snippet shown in inbox list -->
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;max-height:0;max-width:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;">${escapeHtml(previewText)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb;min-width:100%;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:580px;width:100%;">
          <!-- Branded header -->
          <tr>
            <td style="background-color:#3730a3;padding:22px 32px;border-radius:8px 8px 0 0;text-align:center;">
              <p style="margin:0;color:#c7d2fe;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;">بسم الله الرحمن الرحيم</p>
              <h1 style="margin:6px 0 0 0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">Darse Quran Academy</h1>
            </td>
          </tr>
          <!-- Email body -->
          <tr>
            <td style="background-color:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;color:#1c1917;line-height:1.7;font-size:15px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f3f4f6;padding:18px 32px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none;text-align:center;color:#6b7280;font-size:12px;line-height:1.6;">
              <p style="margin:0 0 4px 0;">This is a transactional notification from <strong style="color:#374151;">Darse Quran Academy</strong>.</p>
              <p style="margin:0;">Questions? Reply to this email or visit <a href="https://darsequranacademy.com/contact" style="color:#3730a3;text-decoration:none;">darsequranacademy.com</a>.</p>
              ${footerExtra}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!--[if mso | IE]></td></tr></table><![endif]-->
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Core delivery function
// ---------------------------------------------------------------------------

type EmailPriority = "high" | "normal";

type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

type DeliverMailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Used for dev/logging fallback only */
  preview?: string;
  /** "high" adds Importance + X-Priority headers (for security/payment emails) */
  priority?: EmailPriority;
  /** Adds List-Unsubscribe headers (for announcement-style emails) */
  listUnsubscribeUrl?: string;
  /** Optional file attachments (e.g. PDF receipts or certificates) */
  attachments?: MailAttachment[];
};

async function deliverMail({
  to,
  subject,
  text,
  html,
  preview,
  priority = "normal",
  listUnsubscribeUrl,
  attachments,
}: DeliverMailParams): Promise<EmailSendResult> {
  if (!isEmailConfigured()) {
    console.info("[email] SMTP not configured. Email would be sent to:", to);
    console.info("[email] Subject:", subject);
    if (preview) {
      console.info("[email] Preview:", preview);
    }
    return { sent: false, skipped: true };
  }

  const messageId = generateMessageId();

  const headers: Record<string, string> = {
    "Message-ID": messageId,
    "X-Mailer": "Darse Quran Academy Mailer",
    "X-Entity-Ref-ID": messageId,
    "X-Transaction-ID": messageId,
  };

  // High-priority headers — used for security & payment emails
  if (priority === "high") {
    headers["Importance"] = "high";
    headers["X-Priority"] = "1";
    headers["X-MSMail-Priority"] = "High";
  }

  // List-Unsubscribe — required by Gmail & Yahoo for bulk/announcement senders
  if (listUnsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${listUnsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: getFromAddress(),
      replyTo: getReplyTo(),
      to,
      subject,
      text,
      html,
      headers,
      attachments: attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    console.error("[email] Failed to send email to:", to, message);
    return { sent: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Email: Fatwa answer notification
// ---------------------------------------------------------------------------

export type FatwaAnswerEmailParams = {
  to: string;
  askerName: string;
  questionTitle: string;
  fatwaUrl: string;
};

export async function sendFatwaAnswerEmail(params: FatwaAnswerEmailParams): Promise<EmailSendResult> {
  const { to, askerName, questionTitle, fatwaUrl } = params;
  const displayName = askerName || "Reader";

  const subject = `Your question has been answered — ${questionTitle}`;
  const preview = `Assalamu Alaikum ${displayName}, your question "${questionTitle}" has been answered.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Your question "${questionTitle}" has been answered on Darse Quran Academy.`,
    "",
    "Read the answer here:",
    fatwaUrl,
    "",
    "Darse Quran Academy — Fatwa Section",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Your question <strong>&ldquo;${escapeHtml(questionTitle)}&rdquo;</strong> has been answered by our scholars.</p>
    <p style="margin:28px 0;">
      <a href="${fatwaUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Read the Answer</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Or copy this link: <a href="${fatwaUrl}" style="color:#3730a3;">${escapeHtml(fatwaUrl)}</a></p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: fatwaUrl });
}

// ---------------------------------------------------------------------------
// Email: Admin Notification - Fatwa Submission by Teacher
// ---------------------------------------------------------------------------

export type FatwaSubmissionAdminEmailParams = {
  teacherName: string;
  questionTitle: string;
  adminReviewUrl: string;
};

export async function sendFatwaSubmissionAdminEmail(params: FatwaSubmissionAdminEmailParams): Promise<EmailSendResult> {
  const { teacherName, questionTitle, adminReviewUrl } = params;
  
  // Use first email if there are multiple comma-separated emails
  const to = (process.env.ADMIN_EMAIL || "info@darsequranacademy.org").split(',')[0].trim();

  const subject = `New Fatwa Reply Pending Approval — ${questionTitle}`;
  const preview = `Teacher ${teacherName} has submitted a reply to "${questionTitle}". It requires your approval.`;

  const text = [
    "Assalamu Alaikum Admin,",
    "",
    `Teacher ${teacherName} has submitted a draft reply to the fatwa question: "${questionTitle}".`,
    "",
    "Please review and approve the answer here:",
    adminReviewUrl,
    "",
    "Darse Quran Academy System",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>Admin</strong>,</p>
    <p>Teacher <strong>${escapeHtml(teacherName)}</strong> has submitted a draft reply to the fatwa question: <strong>&ldquo;${escapeHtml(questionTitle)}&rdquo;</strong>.</p>
    <p>It is currently pending your review and approval.</p>
    <p style="margin:28px 0;">
      <a href="${adminReviewUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Review Answer</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Or copy this link: <a href="${adminReviewUrl}" style="color:#3730a3;">${escapeHtml(adminReviewUrl)}</a></p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: adminReviewUrl });
}

// ---------------------------------------------------------------------------
// Email: Teacher Notification - Fatwa Reply Status
// ---------------------------------------------------------------------------

export type FatwaStatusTeacherEmailParams = {
  to: string;
  teacherName: string;
  questionTitle: string;
  status: "approved" | "rejected";
  fatwaUrl: string;
};

export async function sendFatwaStatusTeacherEmail(params: FatwaStatusTeacherEmailParams): Promise<EmailSendResult> {
  const { to, teacherName, questionTitle, status, fatwaUrl } = params;

  const subject = `Fatwa Reply ${status === "approved" ? "Approved" : "Rejected"} — ${questionTitle}`;
  const preview = `Your draft reply to "${questionTitle}" has been ${status}.`;

  const text = [
    `Assalamu Alaikum ${teacherName},`,
    "",
    `Your draft reply to the fatwa question "${questionTitle}" has been ${status} by the admin.`,
    "",
    status === "approved"
      ? "It has been published on the site."
      : "You can view the feedback and resubmit your answer if needed.",
    "",
    "View the question here:",
    fatwaUrl,
    "",
    "Darse Quran Academy System",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(teacherName)}</strong>,</p>
    <p>Your draft reply to the fatwa question <strong>&ldquo;${escapeHtml(questionTitle)}&rdquo;</strong> has been <strong style="color:${status === "approved" ? "#166534" : "#b91c1c"};">${status}</strong> by the admin.</p>
    <p>${status === "approved" ? "It has been published on the site." : "You can view the details and resubmit your answer if needed."}</p>
    <p style="margin:28px 0;">
      <a href="${fatwaUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View Question</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Or copy this link: <a href="${fatwaUrl}" style="color:#3730a3;">${escapeHtml(fatwaUrl)}</a></p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: fatwaUrl });
}

// ---------------------------------------------------------------------------
// Email: Payment declined
// ---------------------------------------------------------------------------

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
    `We could not verify your registration payment for "${courseTitle}" at Darse Quran Academy.`,
    "",
    "Please submit your payment details again (UPI reference or bank transfer proof) using the link below:",
    paymentUrl,
    "",
    "Once we verify your payment, your enrollment will be activated.",
    "",
    "If you believe this was a mistake, please reply to this email or contact the academy.",
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>We could not verify your registration payment for <strong>${escapeHtml(courseTitle)}</strong> at Darse Quran Academy.</p>
    <p>Please submit your payment details again (UPI reference or bank transfer proof):</p>
    <p style="margin:28px 0;">
      <a href="${paymentUrl}" style="background:#b91c1c;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Resubmit Payment</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Or copy this link: <a href="${paymentUrl}" style="color:#3730a3;">${escapeHtml(paymentUrl)}</a></p>
    <p>Once we verify your payment, your enrollment will be activated.</p>
    <p style="font-size:13px;color:#6b7280;">If you believe this was a mistake, please reply to this email.</p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: paymentUrl, priority: "high" });
}

// ---------------------------------------------------------------------------
// Email: Password reset
// ---------------------------------------------------------------------------

export type PasswordResetEmailParams = {
  to: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<EmailSendResult> {
  const { to, resetUrl } = params;

  const subject = "Reset your password — Darse Quran Academy";
  const preview = "We received a request to reset your password. Click the link inside to choose a new one.";

  const text = [
    "Assalamu Alaikum,",
    "",
    "We received a request to reset the password for your Darse Quran Academy account.",
    "",
    "Use the link below to choose a new password. This link expires in one hour.",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum,</p>
    <p>We received a request to reset the password for your <strong>Darse Quran Academy</strong> account.</p>
    <p>Click the button below to choose a new password. <strong>This link expires in one hour.</strong></p>
    <p style="margin:28px 0;">
      <a href="${resetUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Reset Password</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Or copy this link: <a href="${resetUrl}" style="color:#3730a3;">${escapeHtml(resetUrl)}</a></p>
    <p style="font-size:13px;color:#6b7280;">If you did not request a password reset, no action is needed — your account is safe.</p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: resetUrl, priority: "high" });
}

// ---------------------------------------------------------------------------
// Email: Contact inquiry reply
// ---------------------------------------------------------------------------

export type ContactInquiryReplyEmailParams = {
  to: string;
  name: string;
  originalMessage: string;
  reply: string;
};

export async function sendContactInquiryReplyEmail(
  params: ContactInquiryReplyEmailParams,
): Promise<EmailSendResult> {
  const { to, name, originalMessage, reply } = params;
  const displayName = name || "Reader";

  const subject = "Reply from Darse Quran Academy";
  const preview = `Assalamu Alaikum ${displayName}, we have replied to your message.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    "Thank you for contacting Darse Quran Academy. Here is our reply to your message:",
    "",
    reply,
    "",
    "— Your original message —",
    originalMessage,
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Thank you for contacting Darse Quran Academy. Here is our reply to your message:</p>
    <div style="margin:20px 0;padding:16px 20px;border-left:4px solid #d4a017;background:#fef9e7;white-space:pre-wrap;border-radius:0 6px 6px 0;font-size:14px;">${escapeHtml(reply)}</div>
    <p style="font-size:13px;color:#6b7280;margin-top:24px;">Your original message:</p>
    <div style="font-size:13px;color:#6b7280;white-space:pre-wrap;padding:12px 16px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">${escapeHtml(originalMessage)}</div>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: reply.slice(0, 100) });
}

// ---------------------------------------------------------------------------
// Email: Payment approved
// ---------------------------------------------------------------------------

export type NotificationEmailBaseParams = {
  to: string;
  studentName: string;
};

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
    `Your payment for "${courseTitle}" has been successfully verified by Darse Quran Academy.`,
    "",
    "You can view your payment details and download your receipt here:",
    paymentUrl,
    "",
    "Jazakallah Khair,",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Your payment for <strong>${escapeHtml(courseTitle)}</strong> has been <strong style="color:#166534;">successfully verified</strong>. Jazakallah Khair!</p>
    <p style="margin:28px 0;">
      <a href="${paymentUrl}" style="background:#166534;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View Payment & Receipt</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Or copy this link: <a href="${paymentUrl}" style="color:#3730a3;">${escapeHtml(paymentUrl)}</a></p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: paymentUrl, priority: "high" });
}

// ---------------------------------------------------------------------------
// Email: Enrollment approved
// ---------------------------------------------------------------------------

export async function sendEnrollmentApprovedEmail(
  params: NotificationEmailBaseParams & { courseTitle: string; courseUrl: string },
) {
  const { to, studentName, courseTitle, courseUrl } = params;
  const displayName = studentName || "Student";
  const subject = `Enrollment approved — ${courseTitle}`;
  const preview = `Congratulations! Your enrollment in "${courseTitle}" has been approved. You can now access your course.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Congratulations! Your enrollment request for "${courseTitle}" has been approved.`,
    "",
    "You can now access your course from the My Courses dashboard:",
    courseUrl,
    "",
    "We pray this journey is deeply beneficial for you.",
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Congratulations! Your enrollment request for <strong>${escapeHtml(courseTitle)}</strong> has been <strong style="color:#166534;">approved</strong>.</p>
    <p>You can now access your course directly from your dashboard.</p>
    <p style="margin:28px 0;">
      <a href="${courseUrl}" style="background:#166534;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Access Course</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Or copy this link: <a href="${courseUrl}" style="color:#3730a3;">${escapeHtml(courseUrl)}</a></p>
    <p>We pray this journey is deeply beneficial for you. Jazakallah Khair!</p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: courseUrl, priority: "high" });
}

// ---------------------------------------------------------------------------
// Email: Enrollment rejected
// ---------------------------------------------------------------------------

export async function sendEnrollmentRejectedEmail(
  params: NotificationEmailBaseParams & { courseTitle: string; courseUrl: string },
) {
  const { to, studentName, courseTitle, courseUrl } = params;
  const displayName = studentName || "Student";
  const subject = `Enrollment update — ${courseTitle}`;
  const preview = `Your enrollment request for "${courseTitle}" was not approved. Please contact us if you have questions.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Your enrollment request for "${courseTitle}" was not approved by the academy.`,
    "",
    "If you believe this was a mistake or need clarification, please contact us.",
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Your enrollment request for <strong>${escapeHtml(courseTitle)}</strong> was not approved by the academy at this time.</p>
    <p>If you believe this was a mistake or need clarification, please reply to this email or contact our support team.</p>
    ${courseUrl ? `<p style="margin:28px 0;"><a href="${courseUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Contact Us</a></p>` : ""}`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html });
}

// ---------------------------------------------------------------------------
// Email: Course announcement
// ---------------------------------------------------------------------------

export async function sendCourseAnnouncementEmail(
  params: NotificationEmailBaseParams & {
    courseTitle: string;
    announcementTitle: string;
    announcementBody: string;
    announcementUrl: string;
  },
) {
  const { to, studentName, courseTitle, announcementTitle, announcementBody, announcementUrl } = params;
  const displayName = studentName || "Student";
  const subject = `${courseTitle} — ${announcementTitle}`;
  const preview = announcementBody.slice(0, 120);

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `A new announcement has been posted for "${courseTitle}":`,
    "",
    announcementBody,
    "",
    "Read the full announcement here:",
    announcementUrl,
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>A new announcement has been posted for <strong>${escapeHtml(courseTitle)}</strong>:</p>
    <div style="margin:20px 0;padding:16px 20px;border-left:4px solid #3730a3;background:#eef2ff;white-space:pre-wrap;border-radius:0 6px 6px 0;font-size:14px;line-height:1.6;">${escapeHtml(announcementBody)}</div>
    <p style="margin:28px 0;">
      <a href="${announcementUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View Full Announcement</a>
    </p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml, unsubscribeUrl: announcementUrl });

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview: announcementBody.slice(0, 100),
    listUnsubscribeUrl: announcementUrl,
  });
}

// ---------------------------------------------------------------------------
// Email: Personal message from teacher
// ---------------------------------------------------------------------------

export async function sendPersonalMessageEmail(
  params: NotificationEmailBaseParams & {
    teacherName: string;
    courseTitle: string;
    messageTitle: string;
    messageBody: string;
    messageUrl: string;
  },
) {
  const { to, studentName, teacherName, courseTitle, messageTitle, messageBody, messageUrl } = params;
  const displayName = studentName || "Student";
  const subject = `Message from ${teacherName} — ${courseTitle}`;
  const preview = `${teacherName} sent you a message: ${messageBody.slice(0, 80)}`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `You have received a new message from ${teacherName} for the course "${courseTitle}":`,
    "",
    ...(messageTitle ? [`${messageTitle}`, ""] : []),
    messageBody,
    "",
    "View your messages here:",
    messageUrl,
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>You have received a new message from <strong>${escapeHtml(teacherName)}</strong> for the course <strong>${escapeHtml(courseTitle)}</strong>:</p>
    ${messageTitle ? `<h3 style="margin-top:16px;margin-bottom:8px;font-size:16px;color:#1c1917;">${escapeHtml(messageTitle)}</h3>` : ""}
    <div style="margin:12px 0 20px 0;padding:16px 20px;border-left:4px solid #0284c7;background:#f0f9ff;white-space:pre-wrap;border-radius:0 6px 6px 0;font-size:14px;line-height:1.6;">${escapeHtml(messageBody)}</div>
    <p style="margin:28px 0;">
      <a href="${messageUrl}" style="background:#0284c7;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View Message</a>
    </p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: messageBody.slice(0, 100) });
}

// ---------------------------------------------------------------------------
// Email: Site-wide announcement
// ---------------------------------------------------------------------------

export async function sendSiteAnnouncementEmail(
  params: NotificationEmailBaseParams & {
    announcementTitle: string;
    announcementBody: string;
    announcementUrl: string;
  },
) {
  const { to, studentName, announcementTitle, announcementBody, announcementUrl } = params;
  const displayName = studentName || "Student";
  const subject = `Announcement: ${announcementTitle}`;
  const preview = announcementBody.slice(0, 120);

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    announcementBody,
    "",
    "Read more on our site:",
    announcementUrl,
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <h2 style="color:#1c1917;margin-top:20px;margin-bottom:12px;font-size:18px;">${escapeHtml(announcementTitle)}</h2>
    <div style="margin:0 0 20px 0;white-space:pre-wrap;line-height:1.7;">${escapeHtml(announcementBody)}</div>
    <p style="margin:28px 0;">
      <a href="${announcementUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View Announcement</a>
    </p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml, unsubscribeUrl: announcementUrl });

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview: announcementBody.slice(0, 100),
    listUnsubscribeUrl: announcementUrl,
  });
}

// ---------------------------------------------------------------------------
// Email: Book order approved
// ---------------------------------------------------------------------------

export async function sendBookOrderApprovedEmail(
  params: NotificationEmailBaseParams & { orderUrl: string; totalAmountStr: string },
) {
  const { to, studentName, orderUrl, totalAmountStr } = params;
  const displayName = studentName || "Student";
  const subject = "Book order approved — Darse Quran Academy";
  const preview = `Your book order (${totalAmountStr}) has been approved and is being processed.`;

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Your book order (${totalAmountStr}) has been approved and is being processed.`,
    "You will receive another update when it ships.",
    "",
    "View your order details here:",
    orderUrl,
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Your book order (<strong>${escapeHtml(totalAmountStr)}</strong>) has been <strong style="color:#166534;">approved</strong> and is being processed.</p>
    <p>You will receive another notification when your order ships.</p>
    <p style="margin:28px 0;">
      <a href="${orderUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View Order</a>
    </p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, priority: "high" });
}

// ---------------------------------------------------------------------------
// Email: Book order declined
// ---------------------------------------------------------------------------

export async function sendBookOrderDeclinedEmail(
  params: NotificationEmailBaseParams & { orderUrl: string },
) {
  const { to, studentName, orderUrl } = params;
  const displayName = studentName || "Student";
  const subject = "Book order update — Darse Quran Academy";
  const preview = "Your recent book order could not be approved. Please review your order details.";

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    "Your recent book order could not be approved.",
    "If you submitted a payment reference, we may not have been able to verify it.",
    "",
    "View your order or contact us for more information:",
    orderUrl,
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Your recent book order could not be approved. If you submitted a payment reference, we may not have been able to verify it.</p>
    <p style="margin:28px 0;">
      <a href="${orderUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View Order</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">If you have questions, please reply to this email.</p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html });
}

// ---------------------------------------------------------------------------
// Email: Book order shipped
// ---------------------------------------------------------------------------

export async function sendBookOrderShippedEmail(
  params: NotificationEmailBaseParams & { orderUrl: string; courierServiceName: string; trackingId: string },
) {
  const { to, studentName, orderUrl, courierServiceName, trackingId } = params;
  const displayName = studentName || "Student";
  const subject = "Your book order has shipped — Darse Quran Academy";
  const preview = `Good news! Your book order has shipped via ${courierServiceName}. Tracking ID: ${trackingId}`;

  // Bug fix: was using "\\n" (literal backslash-n); corrected to "\n"
  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    "Good news! Your book order has been shipped and is on its way to you.",
    "",
    "Shipment Details:",
    `- Courier: ${courierServiceName}`,
    `- Tracking ID: ${trackingId}`,
    "",
    "View your order details here:",
    orderUrl,
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Good news! Your book order has been <strong style="color:#166534;">shipped</strong> and is on its way to you.</p>
    <div style="margin:20px 0;padding:16px 20px;border-left:4px solid #16a34a;background:#f0fdf4;border-radius:0 6px 6px 0;">
      <p style="margin:0 0 6px 0;font-size:14px;font-weight:600;color:#166534;">Shipment Details</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Courier:</strong> ${escapeHtml(courierServiceName)}</p>
      <p style="margin:0;font-size:14px;"><strong>Tracking ID:</strong> ${escapeHtml(trackingId)}</p>
    </div>
    <p style="margin:28px 0;">
      <a href="${orderUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View Order</a>
    </p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, priority: "high" });
}

// ---------------------------------------------------------------------------
// Email: Book order refunded
// ---------------------------------------------------------------------------

export async function sendBookOrderRefundedEmail(
  params: NotificationEmailBaseParams & { orderUrl: string },
) {
  const { to, studentName, orderUrl } = params;
  const displayName = studentName || "Student";
  const subject = "Book order refunded — Darse Quran Academy";
  const preview = "Your book order has been canceled and your payment has been refunded.";

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    "Your book order has been canceled and your payment has been refunded.",
    "",
    "View your order details here:",
    orderUrl,
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Your book order has been canceled and your payment has been <strong>refunded</strong>.</p>
    <p style="margin:28px 0;">
      <a href="${orderUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">View Order</a>
    </p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html });
}

// ---------------------------------------------------------------------------
// Email: Email address verification
// ---------------------------------------------------------------------------

export type VerificationEmailParams = {
  to: string;
  verificationUrl: string;
};

export async function sendVerificationEmail(params: VerificationEmailParams): Promise<EmailSendResult> {
  const { to, verificationUrl } = params;

  const subject = "Verify your email address — Darse Quran Academy";
  const preview = "Welcome! Please verify your email address to complete your registration.";

  const text = [
    "Assalamu Alaikum,",
    "",
    "Thank you for registering at Darse Quran Academy.",
    "",
    "Please verify your email address by clicking the link below:",
    verificationUrl,
    "",
    "This link will expire in 24 hours.",
    "",
    "If you did not create an account, you can safely ignore this email.",
    "",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum,</p>
    <p>Thank you for registering at <strong>Darse Quran Academy</strong>.</p>
    <p>Please verify your email address by clicking the button below:</p>
    <p style="margin:28px 0;">
      <a href="${verificationUrl}" style="background:#3730a3;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">Verify Email Address</a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Or copy this link: <a href="${verificationUrl}" style="color:#3730a3;">${escapeHtml(verificationUrl)}</a></p>
    <p style="font-size:13px;color:#6b7280;"><strong>This link will expire in 24 hours.</strong></p>
    <p style="font-size:13px;color:#6b7280;">If you did not create an account, you can safely ignore this email.</p>`;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: verificationUrl, priority: "high" });
}

// ---------------------------------------------------------------------------
// Email: Payment receipt with PDF attachment
// ---------------------------------------------------------------------------

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
    `Thank you for your payment for "${courseTitle}" at Darse Quran Academy.`,
    "",
    `Your payment receipt (${invoiceNumber}) for ${amountStr} is attached to this email as a PDF.`,
    "",
    "Please keep it for your records.",
    "",
    "Jazakallah Khair,",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Thank you for your payment for <strong>${escapeHtml(courseTitle)}</strong> at Darse Quran Academy.</p>
    <div style="margin:24px 0;padding:16px 20px;background:#f0fdf4;border-left:4px solid #16a34a;border-radius:0 6px 6px 0;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">Payment Confirmed</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Invoice No:</strong> ${escapeHtml(invoiceNumber)}</p>
      <p style="margin:0;font-size:14px;"><strong>Amount Paid:</strong> ${escapeHtml(amountStr)}</p>
    </div>
    <p>Your official payment receipt is <strong>attached to this email</strong> as a PDF. Please keep it for your records.</p>
    <p style="font-size:13px;color:#6b7280;">If you have any questions, please reply to this email or contact the academy.</p>`;

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

// ---------------------------------------------------------------------------
// Email: Certificate with PDF attachment
// ---------------------------------------------------------------------------

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
      ? `Congratulations on successfully completing "${courseTitle}" at Darse Quran Academy!`
      : `Thank you for your dedication and effort in "${courseTitle}" at Darse Quran Academy!`,
    "",
    `Your ${certLabel} (No. ${certificateNumber}) is attached to this email as a PDF.`,
    "",
    "We pray this certificate is a blessing and a recognition of your sincere efforts in seeking Islamic knowledge.",
    "",
    "Jazakallah Khair,",
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    ${
      isCompletion
        ? `<p>Congratulations on successfully completing <strong>${escapeHtml(courseTitle)}</strong> at Darse Quran Academy! May Allah bless your efforts and make this knowledge a source of benefit for you and others.</p>`
        : `<p>Thank you for your dedication and effort in <strong>${escapeHtml(courseTitle)}</strong> at Darse Quran Academy. Your commitment to Islamic education is truly appreciated.</p>`
    }
    <div style="margin:24px 0;padding:16px 20px;background:#fef9e7;border-left:4px solid #d4a017;border-radius:0 6px 6px 0;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(certLabel)}</p>
      <p style="margin:0 0 4px 0;font-size:14px;"><strong>Course:</strong> ${escapeHtml(courseTitle)}</p>
      <p style="margin:0;font-size:14px;"><strong>Certificate No:</strong> ${escapeHtml(certificateNumber)}</p>
    </div>
    <p>Your <strong>${escapeHtml(certLabel)}</strong> is <strong>attached to this email</strong> as a PDF. Please download and keep it for your records.</p>
    <p style="font-size:13px;color:#6b7280;">We pray this is a source of barakah and motivation to continue on the path of knowledge. Jazakallah Khair!</p>`;

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

// ---------------------------------------------------------------------------
// Email: ID Card with PDF attachment
// ---------------------------------------------------------------------------

export type IdCardEmailParams = {
  to: string;
  studentName: string;
  pdfBuffer: Buffer;
  pdfFilename: string;
};

export async function sendIdCardEmail(params: IdCardEmailParams): Promise<EmailSendResult> {
  const { to, studentName, pdfBuffer, pdfFilename } = params;
  const displayName = studentName || "Student";

  const subject = `Your Digital ID Card — Darse Quran Academy`;
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
    "Darse Quran Academy",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>
    <p>Your official student <strong>Digital ID Card</strong> has been generated.</p>
    <div style="margin:24px 0;padding:16px 20px;background:#f0f9ff;border-left:4px solid #0284c7;border-radius:0 6px 6px 0;">
      <p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:#0369a1;text-transform:uppercase;letter-spacing:0.5px;">Digital ID Card Issued</p>
      <p style="margin:0;font-size:14px;">Your ID card has been generated successfully.</p>
    </div>
    <p>Your ID card is <strong>attached to this email</strong> as a PDF. Please download and keep it for your records.</p>
    <p style="font-size:13px;color:#6b7280;">If you have any questions, please reply to this email.</p>`;

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
