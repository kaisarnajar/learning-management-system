import nodemailer, { type Transporter } from "nodemailer";
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
  /**
   * A per-recipient URL that opts them out when posted to (RFC 8058
   * one-click). Only announcement-style mail should set it; transactional
   * mail (receipts, verification) carries no unsubscribe header.
   */
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

/**
 * The configured sender, parsed once: EMAIL_FROM may be "Name <addr>" or a
 * bare address; SMTP_USER is the fallback, then a noreply address on the
 * site's domain.
 */
export function getSender(): { address: string; display: string } {
  const raw =
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    `noreply@${new URL(BRAND_CONFIG.websiteUrl).hostname}`;
  const stripped = stripEnvQuotes(raw);
  const match = stripped.match(/<([^>]+)>/);
  const address = match ? match[1].trim() : stripped;
  const display = match ? stripped : `${BRAND_CONFIG.name} <${stripped}>`;
  return { address, display };
}

export function getSenderEmail(): string {
  return getSender().address;
}

function getReplyTo(): string {
  const raw = process.env.EMAIL_REPLY_TO?.trim();
  if (raw) return stripEnvQuotes(raw);
  return getSender().address;
}

function generateMessageId(): string {
  const domain = getSender().address.split("@")[1] || new URL(BRAND_CONFIG.websiteUrl).hostname;
  const unique = randomBytes(16).toString("hex");
  return `<${unique}@${domain}>`;
}

// ---------------------------------------------------------------------------
// SMTP transport: one pooled transport per process
// ---------------------------------------------------------------------------

let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (transport) return transport;
  const port = Number(process.env.SMTP_PORT || 587);
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST?.trim(),
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER?.trim(),
      pass: getSmtpPassword(),
    },
    // A pool reuses connections across the announcement fan-out instead of
    // a fresh TLS handshake (and login) per message.
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
  });
  return transport;
}

const TRANSIENT_CODES = new Set(["ECONNECTION", "ETIMEDOUT", "ECONNRESET", "EAI_AGAIN", "ESOCKET", "EPIPE"]);
const RETRY_DELAYS_MS = [1_000, 3_000];

/** Connection drops and 4xx "try again later" replies are worth a retry; rejections are not. */
function isTransientError(error: unknown): boolean {
  const e = error as { code?: string; responseCode?: number };
  if (e?.code && TRANSIENT_CODES.has(e.code)) return true;
  return typeof e?.responseCode === "number" && e.responseCode >= 420 && e.responseCode < 460;
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

  const message = {
    from: getSender().display,
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
  };

  for (let attempt = 0; ; attempt++) {
    try {
      await getTransport().sendMail(message);
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send email.";
      if (isTransientError(error) && attempt < RETRY_DELAYS_MS.length) {
        console.warn(`[email] Transient failure sending to ${to} (attempt ${attempt + 1}): ${message}; retrying`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        continue;
      }
      console.error("[email] Failed to send email to:", to, message);
      return { sent: false, error: message };
    }
  }
}
