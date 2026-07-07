import { escapeHtml } from "./layout";

export function EmailButton({ href, label, color = "#3730a3" }: { href: string; label: string; color?: string }) {
  return `
    <p style="margin:28px 0;">
      <a href="${href}" style="background:${color};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block;">${escapeHtml(label)}</a>
    </p>
  `;
}

export function EmailFallbackLink({ href }: { href: string }) {
  return `
    <p style="font-size:13px;color:#6b7280;">Or copy this link: <a href="${href}" style="color:#3730a3;">${escapeHtml(href)}</a></p>
  `;
}

export type EmailInfoCardItem = { label: string; value: string };

export function EmailInfoCard({
  title,
  items,
  borderColor = "#0284c7",
  bgColor = "#f0f9ff",
  titleColor = "#0369a1",
}: {
  title?: string;
  items: EmailInfoCardItem[];
  borderColor?: string;
  bgColor?: string;
  titleColor?: string;
}) {
  const itemsHtml = items
    .map(
      (item) =>
        `<p style="margin:0 0 4px 0;font-size:14px;"><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.value)}</p>`,
    )
    .join("");

  return `
    <div style="margin:24px 0;padding:16px 20px;background:${bgColor};border-left:4px solid ${borderColor};border-radius:0 6px 6px 0;">
      ${
        title
          ? `<p style="margin:0 0 6px 0;font-size:13px;font-weight:600;color:${titleColor};text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(
              title,
            )}</p>`
          : ""
      }
      ${itemsHtml}
    </div>
  `;
}

export function EmailAlert({
  message,
  type = "info",
}: {
  message: string;
  type?: "info" | "success" | "warning" | "error";
}) {
  const colors = {
    info: { border: "#0284c7", bg: "#f0f9ff", text: "#0369a1" },
    success: { border: "#16a34a", bg: "#f0fdf4", text: "#166534" },
    warning: { border: "#d4a017", bg: "#fef9e7", text: "#92400e" },
    error: { border: "#b91c1c", bg: "#fef2f2", text: "#991b1b" },
  };
  const color = colors[type];

  return `
    <div style="margin:20px 0;padding:16px 20px;border-left:4px solid ${color.border};background:${color.bg};white-space:pre-wrap;border-radius:0 6px 6px 0;font-size:14px;line-height:1.6;">${escapeHtml(
    message,
  )}</div>
  `;
}

export function EmailGreeting({ name }: { name: string }) {
  return `<p>Assalamu Alaikum <strong>${escapeHtml(name)}</strong>,</p>`;
}

export function EmailParagraph({ text }: { text: string }) {
  return `<p>${escapeHtml(text)}</p>`;
}

export function EmailHeading({ text }: { text: string }) {
  return `<h2 style="color:#1c1917;margin-top:20px;margin-bottom:12px;font-size:18px;">${escapeHtml(text)}</h2>`;
}
