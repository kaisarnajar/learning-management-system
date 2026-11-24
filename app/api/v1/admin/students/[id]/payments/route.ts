import { NextRequest } from "next/server";
import { ADMIN_ROLES, pagedBody, staffListParams, staffRead } from "@/services/api-staff";
import { getAllCourses } from "@/services/courses";
import { getPaymentRecordsForUserPaginated } from "@/services/payments";

type Params = { params: Promise<{ id: string }> };

/** A student's payment history (unvoided records), newest first. */
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/students/[id]/payments", async () => {
    const { page, pageSize } = staffListParams(request);
    const [{ items, totalCount }, courses] = await Promise.all([getPaymentRecordsForUserPaginated(id, page, pageSize), getAllCourses()]);
    const titleById = new Map(courses.map((c) => [c.id, c.title]));
    return pagedBody(
      items.map((p) => ({
        id: p.id,
        paidAt: p.paidAt,
        amountInrPaise: p.amountInrPaise,
        courseId: p.courseId,
        courseTitle: p.courseId ? (titleById.get(p.courseId) ?? null) : null,
        description: p.description,
        receiptGeneratedAt: p.receiptGeneratedAt,
      })),
      totalCount,
      page,
      pageSize,
    );
  });
}
