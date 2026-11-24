import { beforeEach, describe, expect, it } from "vitest";
import { GET as listEligible } from "@/app/api/v1/admin/certificates/eligible/route";
import { issueApiSession } from "@/services/api-auth";
import { createCourse, createEnrollment, createUser, resetDb, SKIP_WITHOUT_DB } from "../helpers/db";
import { apiRequest, bearer, jsonOf } from "../helpers/api";

describe.skipIf(SKIP_WITHOUT_DB)("GET /api/v1/admin/certificates/eligible", () => {
  beforeEach(resetDb);

  it("lists only certifiable enrollments, a page at a time", async () => {
    const admin = await createUser({ email: process.env.ADMIN_EMAIL });
    const { accessToken } = await issueApiSession({ id: admin.id, email: admin.email, role: "ADMIN" });
    const course = await createCourse();
    for (let i = 0; i < 3; i++) await createEnrollment((await createUser()).id, course.id);
    await createEnrollment((await createUser()).id, course.id, { status: "rejected", statusEnum: "REJECTED" });

    const response = await listEligible(
      apiRequest(`/api/v1/admin/certificates/eligible?courseId=${course.id}&page=2&pageSize=2`, { headers: bearer(accessToken) }),
    );
    const body = await jsonOf(response);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ totalCount: 3, page: 2, pageSize: 2 });
    expect(body.enrollments).toEqual([expect.objectContaining({ status: "ACTIVE", course: { id: course.id, title: course.title } })]);
  });
});
