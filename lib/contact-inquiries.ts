import { prisma } from "@/lib/prisma";
import { clampPage, paginationArgs } from "@/lib/pagination";
import { andWhere, buildSearchOr } from "@/lib/text-search";

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
  const totalCount = await prisma.contactInquiry.count({ where });
  const safePage = clampPage(page, totalCount, pageSize);
  const items = await prisma.contactInquiry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: contactInquiryInclude,
    ...paginationArgs(safePage, pageSize),
  });
  return { items, totalCount };
}

export async function getContactInquiryById(id: string) {
  return prisma.contactInquiry.findUnique({
    where: { id },
    include: {
      repliedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getPendingContactInquiryCount() {
  return prisma.contactInquiry.count({ where: { reply: null } });
}

export function normalizeContactPhone(phone: string) {
  return phone.replace(/\D/g, "");
}
