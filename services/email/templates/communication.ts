import { deliverMail, EmailSendResult, NotificationEmailBaseParams } from "../core";
import { buildHtmlEmail } from "../layout";
import { EmailGreeting, EmailButton, EmailFallbackLink, EmailAlert, EmailHeading } from "../components";

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
    ${EmailGreeting({ name: displayName })}
    <p>Your question <strong>&ldquo;${questionTitle}&rdquo;</strong> has been answered by our scholars.</p>
    ${EmailButton({ href: fatwaUrl, label: "Read the Answer", color: "#3730a3" })}
    ${EmailFallbackLink({ href: fatwaUrl })}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: fatwaUrl });
}

export type FatwaSubmissionAdminEmailParams = {
  teacherName: string;
  questionTitle: string;
  adminReviewUrl: string;
};

export async function sendFatwaSubmissionAdminEmail(params: FatwaSubmissionAdminEmailParams): Promise<EmailSendResult> {
  const { teacherName, questionTitle, adminReviewUrl } = params;
  
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
    ${EmailGreeting({ name: "Admin" })}
    <p>Teacher <strong>${teacherName}</strong> has submitted a draft reply to the fatwa question: <strong>&ldquo;${questionTitle}&rdquo;</strong>.</p>
    <p>It is currently pending your review and approval.</p>
    ${EmailButton({ href: adminReviewUrl, label: "Review Answer", color: "#3730a3" })}
    ${EmailFallbackLink({ href: adminReviewUrl })}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: adminReviewUrl });
}

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
    ${EmailGreeting({ name: teacherName })}
    <p>Your draft reply to the fatwa question <strong>&ldquo;${questionTitle}&rdquo;</strong> has been <strong style="color:${status === "approved" ? "#166534" : "#b91c1c"};">${status}</strong> by the admin.</p>
    <p>${status === "approved" ? "It has been published on the site." : "You can view the details and resubmit your answer if needed."}</p>
    ${EmailButton({ href: fatwaUrl, label: "View Question", color: "#3730a3" })}
    ${EmailFallbackLink({ href: fatwaUrl })}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: fatwaUrl });
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
    ${EmailGreeting({ name: displayName })}
    <p>Thank you for contacting Darse Quran Academy. Here is our reply to your message:</p>
    ${EmailAlert({ message: reply, type: "warning" })}
    <p style="font-size:13px;color:#6b7280;margin-top:24px;">Your original message:</p>
    <div style="font-size:13px;color:#6b7280;white-space:pre-wrap;padding:12px 16px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">${originalMessage}</div>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: reply.slice(0, 100) });
}

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
    ${EmailGreeting({ name: displayName })}
    <p>A new announcement has been posted for <strong>${courseTitle}</strong>:</p>
    <div style="margin:20px 0;padding:16px 20px;border-left:4px solid #3730a3;background:#eef2ff;white-space:pre-wrap;border-radius:0 6px 6px 0;font-size:14px;line-height:1.6;">${announcementBody}</div>
    ${EmailButton({ href: announcementUrl, label: "View Full Announcement", color: "#3730a3" })}
  `;

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
    ${EmailGreeting({ name: displayName })}
    <p>You have received a new message from <strong>${teacherName}</strong> for the course <strong>${courseTitle}</strong>:</p>
    ${messageTitle ? `<h3 style="margin-top:16px;margin-bottom:8px;font-size:16px;color:#1c1917;">${messageTitle}</h3>` : ""}
    ${EmailAlert({ message: messageBody, type: "info" })}
    ${EmailButton({ href: messageUrl, label: "View Message", color: "#0284c7" })}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: messageBody.slice(0, 100) });
}

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
    ${EmailGreeting({ name: displayName })}
    ${EmailHeading({ text: announcementTitle })}
    <div style="margin:0 0 20px 0;white-space:pre-wrap;line-height:1.7;">${announcementBody}</div>
    ${EmailButton({ href: announcementUrl, label: "View Announcement", color: "#3730a3" })}
  `;

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
