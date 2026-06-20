import fs from 'fs';

let c = fs.readFileSync('app/admin/review-approvals/page.tsx', 'utf8');

const properImports = `import Link from "next/link";
import { ReviewTable } from "@/components/admin/ReviewTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import {
  HOMEPAGE_FEATURED_REVIEWS_MAX,
  getApprovedStudentReviewsForAdminPaginated,
  getFeaturedHomepageReviewCount,
  getPendingStudentReviewsForAdminPaginated,
} from "@/lib/student-reviews";
import { parseSearchQuery } from "@/lib/text-search";

export default async function AdminReviewApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{`;

c = properImports + '\n' + c;

fs.writeFileSync('app/admin/review-approvals/page.tsx', c);
