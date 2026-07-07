import { deliverMail, NotificationEmailBaseParams } from "../core";
import { buildHtmlEmail } from "../layout";
import { EmailGreeting, EmailButton, EmailFallbackLink } from "../components";

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
    ${EmailGreeting({ name: displayName })}
    <p>Congratulations! Your enrollment request for <strong>${courseTitle}</strong> has been <strong style="color:#166534;">approved</strong>.</p>
    <p>You can now access your course directly from your dashboard.</p>
    ${EmailButton({ href: courseUrl, label: "Access Course", color: "#166534" })}
    ${EmailFallbackLink({ href: courseUrl })}
    <p>We pray this journey is deeply beneficial for you. Jazakallah Khair!</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: courseUrl, priority: "high" });
}

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
    ${EmailGreeting({ name: displayName })}
    <p>Your enrollment request for <strong>${courseTitle}</strong> was not approved by the academy at this time.</p>
    <p>If you believe this was a mistake or need clarification, please reply to this email or contact our support team.</p>
    ${courseUrl ? EmailButton({ href: courseUrl, label: "Contact Us", color: "#3730a3" }) : ""}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html });
}
