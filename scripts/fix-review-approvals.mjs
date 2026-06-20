import fs from 'fs';

let content = fs.readFileSync('app/admin/review-approvals/page.tsx', 'utf8');

const importsToReplace = `import Link from "next/link";

import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { approveStudentReview, rejectStudentReview } from "@/app/admin/review-approvals/actions";

import { StarRating } from "@/components/reviews/StarRating";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import {
  HOMEPAGE_FEATURED_REVIEWS_MAX,
  getApprovedStudentReviewsForAdminPaginated,
  getFeaturedHomepageReviewCount,
  getPendingStudentReviewsForAdminPaginated,
  type StudentReviewWithUser,
} from "@/lib/student-reviews";
import { parseSearchQuery } from "@/lib/text-search";`;

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
import { parseSearchQuery } from "@/lib/text-search";`;

content = content.replace(importsToReplace, properImports);

// Remove the inline functions (formatDate, ReviewName, ReviewActions, ReviewTable)
content = content.replace(/function formatDate\([\s\S]*?\}\n\nexport default async function AdminReviewApprovalsPage/m, 'export default async function AdminReviewApprovalsPage');

fs.writeFileSync('app/admin/review-approvals/page.tsx', content);
