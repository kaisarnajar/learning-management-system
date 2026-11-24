import { NextRequest } from "next/server";
import { courseFormOptions } from "@/services/api-admin-courses";
import { ADMIN_ROLES, staffRead } from "@/services/api-staff";
import { getDefaultFeesForLevel } from "@/services/course-pricing";

/** What /admin/courses/new needs: the form's choices and its starting values. */
export async function GET(request: NextRequest) {
  return staffRead(request, ADMIN_ROLES, "api/v1/admin/courses/new", async () => {
    const defaults = getDefaultFeesForLevel("Beginner");
    return {
      options: await courseFormOptions(),
      values: {
        title: "",
        description: "",
        startDate: "",
        duration: "",
        category: "",
        teacherId: "",
        level: "Beginner",
        enrollmentFeeInr: defaults.registrationFeeInr,
        monthlyFeeInr: defaults.monthlyFeeInr,
        feeFrequency: "MONTHLY",
        status: "PUBLISHED",
        featuredOnHomepage: false,
      },
    };
  });
}
