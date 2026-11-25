import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { authenticateApiRequest } from "@/services/api-auth";
import type { Session } from "next-auth";
import { isAdminSession } from "@/services/admin";
import { managesCourseTaughtBy, type CourseActor } from "@/services/course-authorization";
import { APPROVED_ENROLLMENT_STATUSES } from "@/services/enrollments";
import { presignPrivateObject, PRIVATE_FILE_ROUTE, privateKeyFromPath } from "@/services/storage";
import { prisma } from "@/utils/prisma";
import { apiError } from "@/utils/api-response";

export const dynamic = "force-dynamic";

type Viewer = { userId: string; isAdmin: boolean; actor: CourseActor };

/** The signed-in viewer, from the web session or an API Bearer token. */
async function resolveViewer(request: NextRequest): Promise<Viewer | null> {
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, isAdmin: isAdminSession(session), actor: session };
  }
  if (!request.headers.get("authorization")) return null;
  const { user } = await authenticateApiRequest(request);
  if (!user) return null;
  const actor: CourseActor = { user: { id: user.id, email: user.email, name: user.name ?? null, role: user.role as Session["user"]["role"] } };
  return { userId: user.id, isAdmin: user.role === "ADMIN" || user.role === "DEVELOPER", actor };
}

async function canViewAnnouncementAttachment(viewer: Viewer, path: string): Promise<{ ok: boolean; name?: string }> {
  const announcement = await prisma.courseAnnouncement.findFirst({
    where: { attachmentPath: path },
    select: {
      courseId: true,
      enrollmentId: true,
      attachmentName: true,
      course: { select: { teacherId: true } },
    },
  });
  if (!announcement) return { ok: false };
  const name = announcement.attachmentName ?? undefined;
  // Admins, and only the course's current teacher: an author who has since
  // left the course loses access with everything else about it.
  if (await managesCourseTaughtBy(viewer.actor, announcement.course.teacherId)) return { ok: true, name };
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: viewer.userId, courseId: announcement.courseId, statusEnum: { in: [...APPROVED_ENROLLMENT_STATUSES] } },
    select: { id: true },
  });
  if (!enrollment) return { ok: false };
  // A private message to one student is visible to that student only.
  if (announcement.enrollmentId && announcement.enrollmentId !== enrollment.id) return { ok: false };
  return { ok: true, name };
}

async function canViewPaymentScreenshot(viewer: Viewer, path: string): Promise<boolean> {
  if (viewer.isAdmin) {
    const [submission, order] = await Promise.all([
      prisma.coursePaymentSubmission.findFirst({ where: { paymentScreenshotPath: path }, select: { id: true } }),
      prisma.bookOrder.findFirst({ where: { paymentScreenshotPath: path }, select: { id: true } }),
    ]);
    return Boolean(submission || order);
  }
  const [submission, order] = await Promise.all([
    prisma.coursePaymentSubmission.findFirst({ where: { paymentScreenshotPath: path, userId: viewer.userId }, select: { id: true } }),
    prisma.bookOrder.findFirst({ where: { paymentScreenshotPath: path, userId: viewer.userId }, select: { id: true } }),
  ]);
  return Boolean(submission || order);
}

/**
 * GET /api/files/private/<prefix>/<object>: checks that the signed-in user
 * may see the object (admin; course teacher or enrolled student for an
 * announcement attachment; owner for a payment screenshot) and redirects to
 * a presigned URL that expires in five minutes.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ key: string[] }> }) {
  const { key: segments } = await context.params;
  const path = `${PRIVATE_FILE_ROUTE}${segments.join("/")}`;
  const key = privateKeyFromPath(path);
  if (!key) {
    return apiError("Not found", 404);
  }

  const viewer = await resolveViewer(request);
  if (!viewer) {
    return apiError("Sign in to open this file.", 401);
  }

  let allowed = false;
  let downloadName: string | undefined;
  if (key.startsWith("private/announcements/")) {
    const result = await canViewAnnouncementAttachment(viewer, path);
    allowed = result.ok;
    downloadName = result.name;
  } else if (key.startsWith("private/payments/")) {
    allowed = await canViewPaymentScreenshot(viewer, path);
  }

  if (!allowed) {
    // Same answer whether the object is missing or belongs to someone else.
    return apiError("Not found", 404);
  }

  const url = await presignPrivateObject(key, downloadName);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
