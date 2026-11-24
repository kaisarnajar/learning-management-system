import { NextRequest } from "next/server";
import { createTeacher } from "@/app/admin/teachers/actions";
import { ADMIN_ROLES, pagedBody, readActionForm, staffAction, staffListParams, staffRead } from "@/services/api-staff";
import { getAllTeachersPaginated } from "@/services/teachers";

/** Teachers, as on /admin/teachers (newest first; `q` searches name, e-mail and specialization). */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/teachers", async () => {
    const { page, pageSize, q } = staffListParams(request);
    const { items, totalCount } = await getAllTeachersPaginated(page, pageSize, q || undefined);
    return pagedBody(
      items.map((t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        specialization: t.specialization,
        initials: t.initials,
        imageUrl: t.imageUrl,
        published: t.published,
        createdAt: t.createdAt,
      })),
      totalCount,
      page,
      pageSize,
    );
  });
}

/**
 * Add teacher form: email (a registered account), specialization, bio, initials (optional, derived from
 * the account name when blank), published ("on").
 */
export async function POST(request: NextRequest) {
  return staffAction(request, ADMIN_ROLES, "api/v1/admin/teachers POST", async () => createTeacher(await readActionForm(request)));
}
