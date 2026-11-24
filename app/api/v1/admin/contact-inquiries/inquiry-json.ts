import type { ContactInquiry } from "@prisma/client";

type InquiryWithReplier = ContactInquiry & { repliedBy: { id: string; name: string | null; email: string } | null };

/** A contact inquiry as the admin screens show it ("Pending" until it has a reply). */
export function inquiryJson(inquiry: InquiryWithReplier) {
  return {
    id: inquiry.id,
    name: inquiry.name,
    email: inquiry.email,
    phone: inquiry.phone,
    message: inquiry.message,
    reply: inquiry.reply,
    status: inquiry.reply ? "REPLIED" : "PENDING",
    statusLabel: inquiry.reply ? "Replied" : "Pending",
    repliedAt: inquiry.repliedAt,
    repliedBy: inquiry.repliedBy ? { name: inquiry.repliedBy.name, email: inquiry.repliedBy.email } : null,
    createdAt: inquiry.createdAt,
  };
}
