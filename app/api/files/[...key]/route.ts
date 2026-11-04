import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/services/auth";
import { authenticateApiRequest } from "@/services/api-auth";
import { isAdminSession } from "@/services/admin";
import { APPROVED_ENROLLMENT_STATUSES } from "@/services/enrollments";
import { presignPrivateObject, PRIVATE_FILE_ROUTE, privateKeyFromPath } from "@/services/storage";
import { prisma } from "@/utils/prisma";

export const dynamic = "force-dynamic";

type Viewer = { userId: string; isAdmin: boolean; teacherId: string | null };

/** The signed-in viewer, from the web session or an API Bearer token. */
async function resolveViewer(request: NextRequest): Promise<Viewer | null> {
  const session = await auth();
  if (session?.user?.id) {
    return { userId: session.user.id, isAdmin: isAdminSession(session), teacherId: session.user.teacherId ?? null };
  }
  if (!request.headers.get("authorization")) return null;
  const { user } = await authenticateApiRequest(request);
  if (!user) return null;
  const teacher = user.role === "TEACHER"
    ? await prisma.teacher.findFirst({ where: { OR: [{ userId: user.id }, { email: user.email }] }, select: { id: true } })
    : null;
  return { userId: user.id, isAdmin: user.role === "ADMIN" || user.role === "DEVELOPER", teacherId: teacher?.id ?? null };
}

async function canViewAnnouncementAttachment(viewer: Viewer, path: string): Promise<{ ok: boolean; name?: string }> {
  const announcement = await prisma.courseAnnouncement.findFirst({
    where: { attachmentPath: path },
    select: {
      courseId: true,
      enrollmentId: true,
      teacherId: true,
      attachmentName: true,
      course: { select: { teacherId: true } },
    },
  });
  if (!announcement) return { ok: false };
  const name = announcement.attachmentName ?? undefined;
  if (viewer.isAdmin) return { ok: true, name };
  if (viewer.teacherId && (announcement.course.teacherId === viewer.teacherId || announcement.teacherId === viewer.teacherId)) {
    return { ok: true, name };
  }
  const enrollment = await prisma.enrollment.findFirst({
    where: { userId: viewer.userId, courseId: announcement.courseId, status: { in: [...APPROVED_ENROLLMENT_STATUSES] } },
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const viewer = await resolveViewer(request);
  if (!viewer) {
    return NextResponse.json({ error: "Sign in to open this file." }, { status: 401 });
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await presignPrivateObject(key, downloadName);
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
