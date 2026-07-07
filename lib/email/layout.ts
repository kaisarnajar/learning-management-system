import { BRAND_CONFIG } from "@/config/brand";

export function escapeHtml(value: string): string {
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
export function buildHtmlEmail({
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
  <title>${BRAND_CONFIG.name}</title>
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
              <h1 style="margin:6px 0 0 0;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.3px;">${BRAND_CONFIG.name}</h1>
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
              <p style="margin:0 0 4px 0;">This is a transactional notification from <strong style="color:#374151;">${BRAND_CONFIG.name}</strong>.</p>
              <p style="margin:0;">Questions? Reply to this email or visit <a href="${BRAND_CONFIG.websiteUrl}/contact" style="color:#3730a3;text-decoration:none;">${BRAND_CONFIG.websiteUrl.replace(/^https?:\/\//, "")}</a>.</p>
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
