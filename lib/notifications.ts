import { revalidatePath } from "next/cache";
import type { StudentNotification, StudentNotificationType } from "@prisma/client";
import { PENDING_ENROLLMENT_APPROVAL } from "@/lib/enrollment-status";
import {
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
  paginationArgs,
} from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

export type CreateStudentNotificationInput = {
  userId: string;
  type: StudentNotificationType;
  title: string;
  body?: string | null;
  href: string;
  sourceType?: string | null;
  sourceId?: string | null;
};

export function notificationPreview(text: string, maxLength = 120): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1)}…`;
}

export function notificationTypeLabel(type: StudentNotificationType): string {
  switch (type) {
    case "PAYMENT_APPROVED":
      return "Payment approved";
    case "ENROLLMENT_APPROVED":
      return "Enrollment approved";
    case "ENROLLMENT_REJECTED":
      return "Enrollment declined";
    case "COURSE_ANNOUNCEMENT":
      return "Course announcement";
    case "PERSONAL_MESSAGE":
      return "Message from teacher";
    case "SITE_ANNOUNCEMENT":
      return "Academy announcement";
    case "BOOK_ORDER_APPROVED":
      return "Book order approved";
    case "BOOK_ORDER_DECLINED":
      return "Book order declined";
    default:
      return "Notification";
  }
}

export function notificationTypeClass(type: StudentNotificationType): string {
  switch (type) {
    case "PAYMENT_APPROVED":
    case "ENROLLMENT_APPROVED":
    case "BOOK_ORDER_APPROVED":
      return "bg-emerald-100 text-emerald-800";
    case "ENROLLMENT_REJECTED":
    case "BOOK_ORDER_DECLINED":
      return "bg-red-100 text-red-800";
    case "PERSONAL_MESSAGE":
      return "bg-violet-100 text-violet-800";
    case "COURSE_ANNOUNCEMENT":
      return "bg-sky-100 text-sky-800";
    case "SITE_ANNOUNCEMENT":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-accent-muted text-foreground";
  }
}

export async function createStudentNotification(input: CreateStudentNotificationInput) {
  const { userId, type, title, body, href, sourceType, sourceId } = input;

  if (sourceId) {
    return prisma.studentNotification.upsert({
      where: {
        userId_type_sourceId: { userId, type, sourceId },
      },
      create: {
        userId,
        type,
        title,
        body: body ?? null,
        href,
        sourceType: sourceType ?? null,
        sourceId,
      },
      update: {
        title,
        body: body ?? null,
        href,
        sourceType: sourceType ?? null,
        readAt: null,
      },
    });
  }

  return prisma.studentNotification.create({
    data: {
      userId,
      type,
      title,
      body: body ?? null,
      href,
      sourceType: sourceType ?? null,
      sourceId: null,
    },
  });
}

export async function createStudentNotificationsForUsers(
  userIds: string[],
  payload: Omit<CreateStudentNotificationInput, "userId">,
) {
  if (userIds.length === 0) return;

  const uniqueUserIds = [...new Set(userIds)];
  const { type, title, body, href, sourceType, sourceId } = payload;

  if (!sourceId) {
    await prisma.studentNotification.createMany({
      data: uniqueUserIds.map((userId) => ({
        userId,
        type,
        title,
        body: body ?? null,
        href,
        sourceType: sourceType ?? null,
        sourceId: null,
      })),
    });
    return;
  }

  await Promise.all(
    uniqueUserIds.map((userId) =>
      createStudentNotification({
        userId,
        type,
        title,
        body,
        href,
        sourceType,
        sourceId,
      }),
    ),
  );
}

async function getEnrolledStudentUserIdsForCourse(courseId: string): Promise<string[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId,
      status: { not: PENDING_ENROLLMENT_APPROVAL },
    },
    select: { userId: true },
  });
  return enrollments.map((enrollment) => enrollment.userId);
}

async function getNonTeacherUserIds(): Promise<string[]> {
  const teachers = await prisma.teacher.findMany({ select: { email: true } });
  const teacherEmails = teachers.flatMap((teacher) =>
    teacher.email ? [teacher.email.toLowerCase()] : [],
  );

  const users = await prisma.user.findMany({
    where: teacherEmails.length > 0 ? { email: { notIn: teacherEmails } } : {},
    select: { id: true },
  });

  return users.map((user) => user.id);
}

export async function notifyPaymentApproved(params: {
  userId: string;
  courseTitle: string;
  sourceId: string;
  sourceType: "CoursePaymentSubmission" | "PaymentRecord";
}) {
  await createStudentNotification({
    userId: params.userId,
    type: "PAYMENT_APPROVED",
    title: `Payment approved — ${params.courseTitle}`,
    body: "Your payment has been verified. You can view details and download your receipt from Payments.",
    href: "/profile/payments",
    sourceType: params.sourceType,
    sourceId: params.sourceId,
  });
  revalidateNotificationPaths(params.userId);
}

export async function notifyEnrollmentApproved(params: {
  userId: string;
  courseTitle: string;
  enrollmentId: string;
}) {
  await createStudentNotification({
    userId: params.userId,
    type: "ENROLLMENT_APPROVED",
    title: `Enrollment approved — ${params.courseTitle}`,
    body: "You can now access your course from My Courses.",
    href: "/profile/courses",
    sourceType: "Enrollment",
    sourceId: params.enrollmentId,
  });
  revalidateNotificationPaths(params.userId);
}

export async function notifyEnrollmentRejected(params: {
  userId: string;
  courseTitle: string;
  enrollmentId: string;
}) {
  await createStudentNotification({
    userId: params.userId,
    type: "ENROLLMENT_REJECTED",
    title: `Enrollment declined — ${params.courseTitle}`,
    body: "Your enrollment request was not approved. Contact the academy if you have questions.",
    href: "/profile/courses",
    sourceType: "Enrollment",
    sourceId: params.enrollmentId,
  });
  revalidateNotificationPaths(params.userId);
}

export async function notifyEnrolledStudentsOfCourseAnnouncement(params: {
  courseId: string;
  courseTitle: string;
  announcementId: string;
  title: string;
  body: string;
}) {
  const userIds = await getEnrolledStudentUserIdsForCourse(params.courseId);
  await createStudentNotificationsForUsers(userIds, {
    type: "COURSE_ANNOUNCEMENT",
    title: `${params.courseTitle}: ${params.title}`,
    body: notificationPreview(params.body),
    href: `/profile/courses/${params.courseId}/announcements`,
    sourceType: "CourseAnnouncement",
    sourceId: params.announcementId,
  });

  for (const userId of userIds) {
    revalidateNotificationPaths(userId);
  }
}

export async function notifyStudentOfPersonalMessage(params: {
  userId: string;
  courseId: string;
  courseTitle: string;
  announcementId: string;
  title: string;
  body: string;
  teacherName: string;
}) {
  await createStudentNotification({
    userId: params.userId,
    type: "PERSONAL_MESSAGE",
    title: `Message from ${params.teacherName} — ${params.courseTitle}`,
    body: params.title ? `${params.title}: ${notificationPreview(params.body)}` : notificationPreview(params.body),
    href: `/profile/courses/${params.courseId}/announcements`,
    sourceType: "CourseAnnouncement",
    sourceId: params.announcementId,
  });
  revalidateNotificationPaths(params.userId);
}

export async function notifyAllStudentsOfSiteAnnouncement(params: {
  announcementId: string;
  title: string;
  body: string;
}) {
  const userIds = await getNonTeacherUserIds();
  await createStudentNotificationsForUsers(userIds, {
    type: "SITE_ANNOUNCEMENT",
    title: params.title,
    body: notificationPreview(params.body),
    href: `/announcements/${params.announcementId}`,
    sourceType: "SiteAnnouncement",
    sourceId: params.announcementId,
  });

  revalidatePath("/profile/notifications", "page");
  revalidatePath("/profile", "layout");
}

export async function getNotificationsForUserPaginated(
  userId: string,
  page: number,
  pageSize: number = DEFAULT_PAGE_SIZE,
  filter: "all" | "unread" = "all",
): Promise<PaginatedResult<StudentNotification>> {
  const where = {
    userId,
    ...(filter === "unread" ? { readAt: null } : {}),
  };

  const [items, totalCount] = await Promise.all([
    prisma.studentNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...paginationArgs(page, pageSize),
    }),
    prisma.studentNotification.count({ where }),
  ]);

  return { items, totalCount };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.studentNotification.count({
    where: { userId, readAt: null },
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await prisma.studentNotification.findFirst({
    where: { id: notificationId, userId },
  });

  if (!notification) return null;

  if (!notification.readAt) {
    await prisma.studentNotification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  revalidateNotificationPaths(userId);
  return notification;
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.studentNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidateNotificationPaths(userId);
}

export function revalidateNotificationPaths(userId?: string) {
  revalidatePath("/profile/notifications", "page");
  revalidatePath("/profile", "layout");
  if (userId) {
    revalidatePath(`/admin/students/${userId}`, "page");
  }
}

export async function notifyBookOrderApproved(params: {
  userId: string;
  orderId: string;
  totalAmountInrPaise: number;
}) {
  const amountStr = `₹${(params.totalAmountInrPaise / 100).toFixed(2)}`;
  await createStudentNotification({
    userId: params.userId,
    type: "BOOK_ORDER_APPROVED",
    title: "Book order approved",
    body: `Your book order (${amountStr}) has been approved. Your books will be dispatched soon.`,
    href: "/profile/cart",
    sourceType: "BookOrder",
    sourceId: params.orderId,
  });
  revalidateNotificationPaths(params.userId);
}

export async function notifyBookOrderDeclined(params: {
  userId: string;
  orderId: string;
}) {
  await createStudentNotification({
    userId: params.userId,
    type: "BOOK_ORDER_DECLINED",
    title: "Book order declined",
    body: "Your book order was not approved. Please contact the academy for more information.",
    href: "/profile/cart",
    sourceType: "BookOrder",
    sourceId: params.orderId,
  });
  revalidateNotificationPaths(params.userId);
}

export async function notifyBookOrderShipped(params: {
  userId: string;
  orderId: string;
}) {
  await createStudentNotification({
    userId: params.userId,
    type: "BOOK_ORDER_SHIPPED",
    title: "Book order shipped",
    body: "Your book order has been shipped and is on its way!",
    href: "/profile/cart",
    sourceType: "BookOrder",
    sourceId: params.orderId,
  });
  revalidateNotificationPaths(params.userId);
}

export async function notifyBookOrderRefunded(params: {
  userId: string;
  orderId: string;
}) {
  await createStudentNotification({
    userId: params.userId,
    type: "BOOK_ORDER_REFUNDED",
    title: "Book order refunded",
    body: "Your book order has been canceled and the payment has been refunded.",
    href: "/profile/cart",
    sourceType: "BookOrder",
    sourceId: params.orderId,
  });
  revalidateNotificationPaths(params.userId);
}

