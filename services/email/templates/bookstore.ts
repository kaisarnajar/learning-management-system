import { deliverMail, NotificationEmailBaseParams } from "../core";
import { buildHtmlEmail } from "../layout";
import { EmailGreeting, EmailButton, EmailInfoCard } from "../components";

export async function sendBookOrderApprovedEmail(
  params: NotificationEmailBaseParams & { orderUrl: string; totalAmountStr: string },
) {
  const { to, studentName, orderUrl, totalAmountStr } = params;
  const displayName = studentName || "Student";
  const subject = "Book order approved — ${BRAND_CONFIG.name}";
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
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Your book order (<strong>${totalAmountStr}</strong>) has been <strong style="color:#166534;">approved</strong> and is being processed.</p>
    <p>You will receive another notification when your order ships.</p>
    ${EmailButton({ href: orderUrl, label: "View Order", color: "#3730a3" })}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, priority: "high" });
}

export async function sendBookOrderDeclinedEmail(
  params: NotificationEmailBaseParams & { orderUrl: string },
) {
  const { to, studentName, orderUrl } = params;
  const displayName = studentName || "Student";
  const subject = "Book order update — ${BRAND_CONFIG.name}";
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
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Your recent book order could not be approved. If you submitted a payment reference, we may not have been able to verify it.</p>
    ${EmailButton({ href: orderUrl, label: "View Order", color: "#3730a3" })}
    <p style="font-size:13px;color:#6b7280;">If you have questions, please reply to this email.</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html });
}

export async function sendBookOrderShippedEmail(
  params: NotificationEmailBaseParams & { orderUrl: string; courierServiceName: string; trackingId: string },
) {
  const { to, studentName, orderUrl, courierServiceName, trackingId } = params;
  const displayName = studentName || "Student";
  const subject = "Your book order has shipped — ${BRAND_CONFIG.name}";
  const preview = `Good news! Your book order has shipped via ${courierServiceName}. Tracking ID: ${trackingId}`;

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
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Good news! Your book order has been <strong style="color:#166534;">shipped</strong> and is on its way to you.</p>
    ${EmailInfoCard({
      title: "Shipment Details",
      items: [
        { label: "Courier", value: courierServiceName },
        { label: "Tracking ID", value: trackingId },
      ],
      borderColor: "#16a34a",
      bgColor: "#f0fdf4",
      titleColor: "#166534",
    })}
    ${EmailButton({ href: orderUrl, label: "View Order", color: "#3730a3" })}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, priority: "high" });
}

export async function sendBookOrderRefundedEmail(
  params: NotificationEmailBaseParams & { orderUrl: string },
) {
  const { to, studentName, orderUrl } = params;
  const displayName = studentName || "Student";
  const subject = "Book order refunded — ${BRAND_CONFIG.name}";
  const preview = "Your book order has been canceled and your payment has been refunded.";

  const text = [
    `Assalamu Alaikum ${displayName},`,
    "",
    "Your book order has been canceled and your payment has been refunded.",
    "",
    "View your order details here:",
    orderUrl,
    "",
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    ${EmailGreeting({ name: displayName })}
    <p>Your book order has been canceled and your payment has been <strong>refunded</strong>.</p>
    ${EmailButton({ href: orderUrl, label: "View Order", color: "#3730a3" })}
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html });
}
