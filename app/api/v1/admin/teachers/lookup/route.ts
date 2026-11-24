import { NextRequest } from "next/server";
import { previewTeacherAccount } from "@/app/admin/teachers/actions";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";

/**
 * "Verify account" on the teacher form: `?email=` (and `excludeTeacherId=` when editing) →
 * `{ lookup: { ok: true, name, email, image } | { ok: false, error } }`.
 */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/teachers/lookup", async () => {
    const params = request.nextUrl.searchParams;
    const lookup = await previewTeacherAccount(params.get("email") ?? "", params.get("excludeTeacherId") || undefined);
    return { lookup };
  });
}
