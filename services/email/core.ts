import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { BRAND_CONFIG } from "@/config/brand";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmailSendResult = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

export type EmailPriority = "high" | "normal";

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type DeliverMailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
  preview?: string;
  priority?: EmailPriority;
  listUnsubscribeUrl?: string;
  attachments?: MailAttachment[];
};

export type NotificationEmailBaseParams = {
  to: string;
  studentName: string;
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

export function getSenderEmail(): string {
  const raw =
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    `noreply@${new URL(BRAND_CONFIG.websiteUrl).hostname}`;
  const stripped = stripEnvQuotes(raw);
  const match = stripped.match(/<([^>]+)>/);
  return match ? match[1].trim() : stripped;
}

function getFromAddress(): string {
  const raw =
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    `noreply@${BRAND_CONFIG.websiteUrl.replace(/^https?:\/\//, "")}`;
  const stripped = stripEnvQuotes(raw);
  if (stripped.includes("<")) return stripped;
  return `${BRAND_CONFIG.name} <${stripped}>`;
}

function getReplyTo(): string {
  const raw = process.env.EMAIL_REPLY_TO?.trim();
  if (raw) return stripEnvQuotes(raw);
  return getSenderEmail();
}

function generateMessageId(): string {
  const domain = getSenderEmail().split("@")[1] || BRAND_CONFIG.websiteUrl.replace(/^https?:\/\//, "");
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
// Core delivery function
// ---------------------------------------------------------------------------

export async function deliverMail({
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
    "X-Mailer": `${BRAND_CONFIG.name} Mailer`,
    "X-Entity-Ref-ID": messageId,
    "X-Transaction-ID": messageId,
  };

  if (priority === "high") {
    headers["Importance"] = "high";
    headers["X-Priority"] = "1";
    headers["X-MSMail-Priority"] = "High";
  }

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
