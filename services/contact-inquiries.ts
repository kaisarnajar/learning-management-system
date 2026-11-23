import { prisma } from "@/utils/prisma";
import { clampPage, paginationArgs } from "@/utils/pagination";
import { andWhere, buildSearchOr } from "@/utils/text-search";
import { withDbErrorHandling } from "@/utils/db-error";

export type ContactInquiryFilter = "pending" | "replied" | undefined;

function contactInquirySearchWhere(searchQuery?: string) {
  if (!searchQuery) return undefined;
  return buildSearchOr(["name", "email", "phone", "message"], [], searchQuery);
}

function contactInquiryWhere(filter?: ContactInquiryFilter, searchQuery?: string) {
  const statusWhere =
    filter === "pending"
      ? { reply: null }
      : filter === "replied"
        ? { reply: { not: null } }
        : undefined;
  return andWhere(statusWhere, contactInquirySearchWhere(searchQuery));
}

const contactInquiryInclude = {
  repliedBy: { select: { id: true, name: true, email: true } },
} as const;

export async function getAllContactInquiriesPaginated(
  page: number,
  pageSize: number,
  filter?: ContactInquiryFilter,
  searchQuery?: string,
) {
  const where = contactInquiryWhere(filter, searchQuery);
  const totalCount = await withDbErrorHandling(() => prisma.contactInquiry.count({ where }), "Database operation failed");
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await withDbErrorHandling(() => prisma.contactInquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: contactInquiryInclude,
      ...paginationArgs(safePage, pageSize),
    }), "Database operation failed");
  return { items, totalCount };
}

export async function getContactInquiryById(id: string) {
  return withDbErrorHandling(() => prisma.contactInquiry.findUnique({
      where: { id },
      include: {
        repliedBy: { select: { id: true, name: true, email: true } },
      },
    }), "Database operation failed");
}

export async function getPendingContactInquiryCount() {
  return withDbErrorHandling(() => prisma.contactInquiry.count({ where: { reply: null } }), "Database operation failed");
}

export function normalizeContactPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

/**
 * Stores a contact-form message (website and mobile app). A signed-in
 * sender's account name and e-mail take precedence over the typed ones, and
 * the inquiry is linked to the account only when it still exists.
 */
export async function createContactInquiry(input: {
  sender: { id: string; name?: string | null; email?: string | null } | null;
  name: string;
  email: string;
  phone?: string | null;
  message: string;
}) {
  const name = input.sender?.name?.trim() || input.name;
  const email = input.sender?.email?.toLowerCase().trim() || input.email;

  let userId: string | null = null;
  if (input.sender?.id) {
    const user = await prisma.user.findFirst({ where: { id: input.sender.id, deletedAt: null }, select: { id: true } });
    userId = user?.id ?? null;
  }

  return withDbErrorHandling(() => prisma.contactInquiry.create({
    data: { userId, name, email, phone: normalizeContactPhone(input.phone ?? ""), message: input.message },
    select: { id: true, createdAt: true },
  }), "Database operation failed");
}
