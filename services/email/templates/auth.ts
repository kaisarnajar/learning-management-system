import { deliverMail, EmailSendResult } from "../core";
import { buildHtmlEmail } from "../layout";
import { EmailButton, EmailFallbackLink } from "../components";
import { BRAND_CONFIG } from "@/config/brand";

export type VerificationEmailParams = {
  to: string;
  verificationUrl: string;
};

export async function sendVerificationEmail(params: VerificationEmailParams): Promise<EmailSendResult> {
  const { to, verificationUrl } = params;

  const subject = "Verify your email address — ${BRAND_CONFIG.name}";
  const preview = "Welcome! Please verify your email address to complete your registration.";

  const text = [
    "Assalamu Alaikum,",
    "",
    "Thank you for registering at ${BRAND_CONFIG.name}.",
    "",
    "Please verify your email address by clicking the link below:",
    verificationUrl,
    "",
    "This link will expire in 24 hours.",
    "",
    "If you did not create an account, you can safely ignore this email.",
    "",
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum,</p>
    <p>Thank you for registering at <strong>${BRAND_CONFIG.name}</strong>.</p>
    <p>Please verify your email address by clicking the button below:</p>
    ${EmailButton({ href: verificationUrl, label: "Verify Email Address", color: "#3730a3" })}
    ${EmailFallbackLink({ href: verificationUrl })}
    <p style="font-size:13px;color:#6b7280;"><strong>This link will expire in 24 hours.</strong></p>
    <p style="font-size:13px;color:#6b7280;">If you did not create an account, you can safely ignore this email.</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: verificationUrl, priority: "high" });
}

export type PasswordResetEmailParams = {
  to: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<EmailSendResult> {
  const { to, resetUrl } = params;

  const subject = "Reset your password — ${BRAND_CONFIG.name}";
  const preview = "We received a request to reset your password. Click the link inside to choose a new one.";

  const text = [
    "Assalamu Alaikum,",
    "",
    "We received a request to reset the password for your ${BRAND_CONFIG.name} account.",
    "",
    "Use the link below to choose a new password. This link expires in one hour.",
    resetUrl,
    "",
    "If you did not request this, you can ignore this email.",
    "",
    "${BRAND_CONFIG.name}",
  ].join("\n");

  const bodyHtml = `
    <p>Assalamu Alaikum,</p>
    <p>We received a request to reset the password for your <strong>${BRAND_CONFIG.name}</strong> account.</p>
    <p>Click the button below to choose a new password. <strong>This link expires in one hour.</strong></p>
    ${EmailButton({ href: resetUrl, label: "Reset Password", color: "#3730a3" })}
    ${EmailFallbackLink({ href: resetUrl })}
    <p style="font-size:13px;color:#6b7280;">If you did not request a password reset, no action is needed — your account is safe.</p>
  `;

  const html = buildHtmlEmail({ previewText: preview, bodyHtml });

  return deliverMail({ to, subject, text, html, preview: resetUrl, priority: "high" });
}
