import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CourseStatus, EnrollmentStatus } from "@prisma/client";
import { submitCheckout } from "@/app/actions/checkout";
import { POST as enrollViaApi } from "@/app/api/v1/enrollments/route";
import { auth } from "@/services/auth";
import { enrollmentStatusData } from "@/services/status-compat";
import { prisma } from "@/utils/prisma";
import { apiRequest, bearerFor, jsonOf, type Json } from "../helpers/api";
import { createCourse, createEnrollment, createUser, PROFILE_FIELDS, resetDb, sessionFor, setPaymentSettings, SKIP_WITHOUT_DB } from "../helpers/db";

// requestEnrollment (services/enrollments.ts) decides; the website's checkout
// action and POST /api/v1/enrollments only phrase the outcome. Each case runs
// through both entry points, for separate students in the same situation, and
// both must land on the same outcome.

type Outcome = "STARTED_AWAITING_FEE" | "STARTED_PENDING_APPROVAL" | "COURSE_NOT_OPEN" | "ALREADY_REQUESTED" | "PROFILE_INCOMPLETE" | "PAYMENTS_NOT_CONFIGURED";

type Case = {
  course: CourseStatus;
  existing: EnrollmentStatus | null;
  profileComplete: boolean;
  free?: boolean;
  upi?: boolean;
};

function expected(c: Case): Outcome {
  if (c.course !== "PUBLISHED" && c.course !== "ONGOING") return "COURSE_NOT_OPEN";
  if (c.existing && c.existing !== "REJECTED") return "ALREADY_REQUESTED";
  if (!c.profileComplete) return "PROFILE_INCOMPLETE";
  if (!c.free && c.upi === false) return "PAYMENTS_NOT_CONFIGURED";
  return c.free ? "STARTED_PENDING_APPROVAL" : "STARTED_AWAITING_FEE";
}

function webOutcome(result: Awaited<ReturnType<typeof submitCheckout>>, courseId: string): Outcome {
  const r = result as { error?: string; status?: number; alreadyEnrolled?: boolean; profileIncomplete?: boolean; redirectUrl?: string };
  if (r.alreadyEnrolled) return "ALREADY_REQUESTED";
  if (r.profileIncomplete) return "PROFILE_INCOMPLETE";
  if (r.status === 404) return "COURSE_NOT_OPEN";
  if (r.status === 503) return "PAYMENTS_NOT_CONFIGURED";
  if (r.redirectUrl === `/profile/courses/${courseId}/enrollment-pay`) return "STARTED_AWAITING_FEE";
  if (r.redirectUrl === "/profile/courses") return "STARTED_PENDING_APPROVAL";
  throw new Error(`unexpected web result ${JSON.stringify(result)}`);
}

function apiOutcome(status: number, body: Json): Outcome {
  if (body.alreadyEnrolled) return "ALREADY_REQUESTED";
  if (body.profileIncomplete) return "PROFILE_INCOMPLETE";
  if (status === 400 && body.error === "This course is not open for enrollment.") return "COURSE_NOT_OPEN";
  if (status === 503) return "PAYMENTS_NOT_CONFIGURED";
  if (body.success && body.requiresEnrollmentFee === true) return "STARTED_AWAITING_FEE";
  if (body.success && body.requiresEnrollmentFee === false) return "STARTED_PENDING_APPROVAL";
  throw new Error(`unexpected API result ${status} ${JSON.stringify(body)}`);
}

const cases: Case[] = [];
for (const course of ["ONGOING", "PUBLISHED", "COMPLETED", "DRAFT", "COMING_SOON"] as CourseStatus[]) {
  for (const existing of [null, "REJECTED", "PENDING_APPROVAL", "AWAITING_ENROLLMENT_FEE", "ACTIVE", "COMPLETED"] as (EnrollmentStatus | null)[]) {
    for (const profileComplete of [true, false]) cases.push({ course, existing, profileComplete });
  }
}
cases.push(
  { course: "ONGOING", existing: null, profileComplete: true, free: true },
  { course: "ONGOING", existing: null, profileComplete: true, upi: false },
  { course: "ONGOING", existing: "ACTIVE", profileComplete: true, upi: false },
  { course: "ONGOING", existing: null, profileComplete: false, upi: false },
);

const name = (c: Case) =>
  `${c.course} course, ${c.existing ?? "no"} enrollment, profile ${c.profileComplete ? "complete" : "incomplete"}${c.free ? ", free" : ""}${c.upi === false ? ", no UPI" : ""}`;

describe.skipIf(SKIP_WITHOUT_DB)("requestEnrollment through the website and the mobile API", () => {
  beforeEach(resetDb);

  it.each(cases.map((c) => [name(c), c] as const))("%s", async (_label, c) => {
    if (c.upi !== false) await setPaymentSettings();
    const course = await createCourse({ status: c.course, ...(c.free ? { priceInrPaise: 0 } : {}) });

    const student = async () => {
      const user = await createUser(c.profileComplete ? PROFILE_FIELDS : {});
      if (c.existing) await createEnrollment(user.id, course.id, enrollmentStatusData(c.existing));
      return user;
    };

    const webStudent = await student();
    vi.mocked(auth).mockResolvedValue(sessionFor(webStudent, "STUDENT") as never);
    const web = webOutcome(await submitCheckout(course.id), course.id);

    const apiStudent = await student();
    const response = await enrollViaApi(
      apiRequest("/api/v1/enrollments", { method: "POST", headers: await bearerFor(apiStudent), json: { courseId: course.id } }),
    );
    const api = apiOutcome(response.status, await jsonOf(response));

    expect({ web, api }).toEqual({ web: expected(c), api: expected(c) });

    if (expected(c).startsWith("STARTED")) {
      const want = c.free ? "PENDING_APPROVAL" : "AWAITING_ENROLLMENT_FEE";
      for (const user of [webStudent, apiStudent]) {
        const row = await prisma.enrollment.findUniqueOrThrow({ where: { userId_courseId: { userId: user.id, courseId: course.id } } });
        expect(row.statusEnum).toBe(want);
      }
    }
  });
});
