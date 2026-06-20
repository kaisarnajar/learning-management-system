import fs from 'fs';

const properImports = `import Link from "next/link";
import { AdminEnrollUserForm } from "@/components/admin/AdminEnrollUserForm";
import { EnrollmentRequestsTable } from "@/components/admin/EnrollmentRequestsTable";
import { ListSearchForm } from "@/components/shared/ListSearchForm";
import { Pagination } from "@/components/shared/Pagination";
import { isCourseEnrollmentOpen } from "@/lib/course-status";
import { getAllCourses } from "@/lib/courses";
import {
  getAwaitingEnrollmentFeeEnrollmentsPaginated,
  getPendingFreeEnrollmentApprovalsPaginated,
  type PendingEnrollmentWithUser,
} from "@/lib/enrollments";
import { clampPage, parsePaginationParams } from "@/lib/pagination";
import { parseSearchQuery } from "@/lib/text-search";

export default async function AdminEnrollmentsPage({`;

let c = fs.readFileSync('app/admin/enrollments/page.tsx', 'utf8');
const lines = c.split(/\r?\n/);
const remainingLines = lines.slice(10); // keep from line 11 onwards
c = properImports + '\n' + remainingLines.join('\n');
fs.writeFileSync('app/admin/enrollments/page.tsx', c);
