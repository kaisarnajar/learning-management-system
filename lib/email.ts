import nodemailer from "nodemailer";

export type EmailSendResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

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

function getFromAddress(): string {
  const raw =
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "noreply@darsequranacademy.org";
  return stripEnvQuotes(raw);
}

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

type DeliverMailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
  preview?: string;
};

async function deliverMail({
  to,
  subject,
  text,
  html,
  preview,
}: DeliverMailParams): Promise<EmailSendResult> {
  if (!isEmailConfigured()) {
    console.info("[email] SMTP not configured. Email would be sent to:", to);
    console.info("[email] Subject:", subject);
    if (preview) {
      console.info("[email] Preview:", preview);
    }
    return { sent: false, skipped: true };
  }

  try {
    const transport = createTransport();
    await transport.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    console.error("[email] Failed to send email to:", to, message);
    return { sent: false, error: message };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type FatwaAnswerEmailParams = {
  to: string;
  askerName: string;
  questionTitle: string;
  fatwaUrl: string;
};

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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    `<p>We could not verify your registration payment for <strong>${escapeHtml(courseTitle)}</strong> at Darse Quran Academy.</p>`,
    "<p>Please submit your payment details again (UPI reference or bank transfer proof):</p>",
    '<p style="margin: 28px 0;">',
    `<a href="${paymentUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">`,
    "Resubmit payment",
    "</a></p>",
    `<p style="font-size: 14px; color: #57534e;">Or copy this link: <a href="${paymentUrl}">${escapeHtml(paymentUrl)}</a></p>`,
    "<p>Once we verify your payment, your enrollment will be activated.</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview: paymentUrl,
  });
}

export type PasswordResetEmailParams = {
  to: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<EmailSendResult> {
  const { to, resetUrl } = params;

  const subject = "Reset your password — Darse Quran Academy";
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    "<p>Assalamu Alaikum,</p>",
    "<p>We received a request to reset the password for your Darse Quran Academy account.</p>",
    "<p>Click the button below to choose a new password. This link expires in one hour.</p>",
    '<p style="margin: 28px 0;">',
    `<a href="${resetUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">`,
    "Reset password",
    "</a></p>",
    `<p style="font-size: 14px; color: #57534e;">Or copy this link: <a href="${resetUrl}">${escapeHtml(resetUrl)}</a></p>`,
    "<p>If you did not request this, you can ignore this email.</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview: resetUrl,
  });
}

export async function sendFatwaAnswerEmail(params: FatwaAnswerEmailParams): Promise<EmailSendResult> {
  const { to, askerName, questionTitle, fatwaUrl } = params;
  const displayName = askerName || "Reader";

  const subject = `Your question has been answered — ${questionTitle}`;
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    `<p>Your question <strong>${escapeHtml(questionTitle)}</strong> has been answered.</p>`,
    '<p style="margin: 28px 0;">',
    `<a href="${fatwaUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">`,
    "Read the answer",
    "</a></p>",
    `<p style="font-size: 14px; color: #57534e;">Or copy this link: <a href="${fatwaUrl}">${escapeHtml(fatwaUrl)}</a></p>`,
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview: fatwaUrl,
  });
}

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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    "<p>Thank you for contacting Darse Quran Academy. Here is our reply to your message:</p>",
    `<div style="margin: 20px 0; padding: 16px; border-left: 4px solid #d4a017; background: #fef9e7; white-space: pre-wrap;">${escapeHtml(reply)}</div>`,
    '<p style="font-size: 14px; color: #57534e; margin-top: 24px;">Your original message:</p>',
    `<div style="font-size: 14px; color: #57534e; white-space: pre-wrap;">${escapeHtml(originalMessage)}</div>`,
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview: reply,
  });
}

export type NotificationEmailBaseParams = {
  to: string;
  studentName: string;
};

export async function sendPaymentApprovedEmail(params: NotificationEmailBaseParams & { courseTitle: string; paymentUrl: string }) {
  const { to, studentName, courseTitle, paymentUrl } = params;
  const displayName = studentName || "Student";
  const subject = `Payment approved — ${courseTitle}`;
  
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    `<p>Your payment for <strong>${escapeHtml(courseTitle)}</strong> has been successfully verified.</p>`,
    '<p style="margin: 28px 0;">',
    `<a href="${paymentUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">View Payment Details</a>`,
    "</p>",
    `<p style="font-size: 14px; color: #57534e;">Or copy this link: <a href="${paymentUrl}">${escapeHtml(paymentUrl)}</a></p>`,
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html, preview: paymentUrl });
}

export async function sendEnrollmentApprovedEmail(params: NotificationEmailBaseParams & { courseTitle: string; courseUrl: string }) {
  const { to, studentName, courseTitle, courseUrl } = params;
  const displayName = studentName || "Student";
  const subject = `Enrollment approved — ${courseTitle}`;
  
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    `<p>Congratulations! Your enrollment request for <strong>${escapeHtml(courseTitle)}</strong> has been approved.</p>`,
    '<p>You can now access your course directly from your dashboard.</p>',
    '<p style="margin: 28px 0;">',
    `<a href="${courseUrl}" style="background: #166534; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Access Course</a>`,
    "</p>",
    `<p style="font-size: 14px; color: #57534e;">Or copy this link: <a href="${courseUrl}">${escapeHtml(courseUrl)}</a></p>`,
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html, preview: courseUrl });
}

export async function sendEnrollmentRejectedEmail(params: NotificationEmailBaseParams & { courseTitle: string; courseUrl: string }) {
  const { to, studentName, courseTitle, courseUrl } = params;
  const displayName = studentName || "Student";
  const subject = `Enrollment update — ${courseTitle}`;
  
  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    `Your enrollment request for "${courseTitle}" was not approved by the academy.`,
    "",
    "If you believe this was a mistake or need clarification, please contact us.",
    "",
    "Darse Quran Academy",
  ].join("\n");

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    `<p>Your enrollment request for <strong>${escapeHtml(courseTitle)}</strong> was not approved by the academy.</p>`,
    '<p>If you believe this was a mistake or need clarification, please contact our support team.</p>',
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html });
}

export async function sendCourseAnnouncementEmail(params: NotificationEmailBaseParams & { courseTitle: string; announcementTitle: string; announcementBody: string; announcementUrl: string }) {
  const { to, studentName, courseTitle, announcementTitle, announcementBody, announcementUrl } = params;
  const displayName = studentName || "Student";
  const subject = `${courseTitle} — ${announcementTitle}`;
  
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    `<p>A new announcement has been posted for <strong>${escapeHtml(courseTitle)}</strong>:</p>`,
    `<div style="margin: 20px 0; padding: 16px; border-left: 4px solid #3730a3; background: #f3f4f6; white-space: pre-wrap;">${escapeHtml(announcementBody)}</div>`,
    '<p style="margin: 28px 0;">',
    `<a href="${announcementUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">View Announcement</a>`,
    "</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html, preview: announcementBody.slice(0, 100) });
}

export async function sendPersonalMessageEmail(params: NotificationEmailBaseParams & { teacherName: string; courseTitle: string; messageTitle: string; messageBody: string; messageUrl: string }) {
  const { to, studentName, teacherName, courseTitle, messageTitle, messageBody, messageUrl } = params;
  const displayName = studentName || "Student";
  const subject = `Message from ${teacherName} — ${courseTitle}`;
  
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    `<p>You have received a new message from <strong>${escapeHtml(teacherName)}</strong> for the course <strong>${escapeHtml(courseTitle)}</strong>:</p>`,
    messageTitle ? `<h3 style="margin-top: 16px;">${escapeHtml(messageTitle)}</h3>` : "",
    `<div style="margin: 20px 0; padding: 16px; border-left: 4px solid #0284c7; background: #f0f9ff; white-space: pre-wrap;">${escapeHtml(messageBody)}</div>`,
    '<p style="margin: 28px 0;">',
    `<a href="${messageUrl}" style="background: #0284c7; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">View Message</a>`,
    "</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html, preview: messageBody.slice(0, 100) });
}

export async function sendSiteAnnouncementEmail(params: NotificationEmailBaseParams & { announcementTitle: string; announcementBody: string; announcementUrl: string }) {
  const { to, studentName, announcementTitle, announcementBody, announcementUrl } = params;
  const displayName = studentName || "Student";
  const subject = announcementTitle;
  
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    `<h2 style="color: #1c1917; margin-top: 24px;">${escapeHtml(announcementTitle)}</h2>`,
    `<div style="margin: 20px 0; white-space: pre-wrap;">${escapeHtml(announcementBody)}</div>`,
    '<p style="margin: 28px 0;">',
    `<a href="${announcementUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">View Announcement</a>`,
    "</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html, preview: announcementBody.slice(0, 100) });
}

export async function sendBookOrderApprovedEmail(params: NotificationEmailBaseParams & { orderUrl: string; totalAmountStr: string }) {
  const { to, studentName, orderUrl, totalAmountStr } = params;
  const displayName = studentName || "Student";
  const subject = "Book order approved";
  
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    `<p>Your book order (<strong>${escapeHtml(totalAmountStr)}</strong>) has been approved and is being processed.</p>`,
    "<p>You will receive another update when your order ships.</p>",
    '<p style="margin: 28px 0;">',
    `<a href="${orderUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">View Order</a>`,
    "</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html });
}

export async function sendBookOrderDeclinedEmail(params: NotificationEmailBaseParams & { orderUrl: string }) {
  const { to, studentName, orderUrl } = params;
  const displayName = studentName || "Student";
  const subject = "Book order declined";
  
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    "<p>Your recent book order could not be approved. If you submitted a payment reference, we may not have been able to verify it.</p>",
    '<p style="margin: 28px 0;">',
    `<a href="${orderUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">View Order</a>`,
    "</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html });
}

export async function sendBookOrderShippedEmail(params: NotificationEmailBaseParams & { orderUrl: string; courierServiceName: string; trackingId: string }) {
  const { to, studentName, orderUrl, courierServiceName, trackingId } = params;
  const displayName = studentName || "Student";
  const subject = "Your book order has shipped!";
  
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
  ].join("\\n");

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    "<p>Good news! Your book order has been shipped and is on its way to you.</p>",
    '<div style="margin: 20px 0; padding: 16px; border-left: 4px solid #16a34a; background: #f0fdf4;">',
    '<h3 style="margin-top: 0; color: #166534;">Shipment Details</h3>',
    `<p style="margin: 0;"><strong>Courier:</strong> ${escapeHtml(courierServiceName)}</p>`,
    `<p style="margin: 0;"><strong>Tracking ID:</strong> ${escapeHtml(trackingId)}</p>`,
    '</div>',
    '<p style="margin: 28px 0;">',
    `<a href="${orderUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">View Order</a>`,
    "</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html });
}

export async function sendBookOrderRefundedEmail(params: NotificationEmailBaseParams & { orderUrl: string }) {
  const { to, studentName, orderUrl } = params;
  const displayName = studentName || "Student";
  const subject = "Book order refunded";
  
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    `<p>Assalamu Alaikum <strong>${escapeHtml(displayName)}</strong>,</p>`,
    "<p>Your book order has been canceled and your payment has been refunded.</p>",
    '<p style="margin: 28px 0;">',
    `<a href="${orderUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">View Order</a>`,
    "</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({ to, subject, text, html });
}

export type VerificationEmailParams = {
  to: string;
  verificationUrl: string;
};

export async function sendVerificationEmail(params: VerificationEmailParams): Promise<EmailSendResult> {
  const { to, verificationUrl } = params;

  const subject = "Verify your email address — Darse Quran Academy";
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

  const html = [
    '<div style="font-family: system-ui, sans-serif; line-height: 1.6; color: #1c1917; max-width: 560px;">',
    "<p>Assalamu Alaikum,</p>",
    "<p>Thank you for registering at Darse Quran Academy.</p>",
    "<p>Please verify your email address by clicking the button below:</p>",
    '<p style="margin: 28px 0;">',
    `<a href="${verificationUrl}" style="background: #3730a3; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">`,
    "Verify Email",
    "</a></p>",
    `<p style="font-size: 14px; color: #57534e;">Or copy this link: <a href="${verificationUrl}">${escapeHtml(verificationUrl)}</a></p>`,
    "<p>This link will expire in 24 hours.</p>",
    "<p>If you did not create an account, you can safely ignore this email.</p>",
    '<p style="margin-top: 24px; font-size: 14px; color: #57534e;">— Darse Quran Academy</p>',
    "</div>",
  ].join("");

  return deliverMail({
    to,
    subject,
    text,
    html,
    preview: verificationUrl,
  });
}
