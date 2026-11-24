import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { StudentNotification, StudentNotificationType } from "@prisma/client";
import { ENROLLMENT_STATUS } from "@/config/constants/business";
import {
  DEFAULT_PAGE_SIZE,
  type PaginatedResult,
  paginationArgs,
} from "@/utils/pagination";
import { prisma } from "@/utils/prisma";
import { withDbErrorHandling } from "@/utils/db-error";

import { getAppBaseUrl } from "@/services/password-reset";
import {
  sendPaymentApprovedEmail,
  sendEnrollmentApprovedEmail,
  sendEnrollmentRejectedEmail,
  buildCourseAnnouncementEmail,
  buildSiteAnnouncementEmail,
  type DeliverMailParams,
  sendPersonalMessageEmail,
  sendBookOrderApprovedEmail,
  sendBookOrderDeclinedEmail,
  sendBookOrderShippedEmail,
  sendBookOrderRefundedEmail
} from "@/services/email";
import { drainOutbox, enqueueEmails } from "@/services/email-outbox";
import { buildUnsubscribeUrl } from "@/services/email-unsubscribe";
import { sendPushToUsers } from "@/services/push";

/**
 * Runs an asynchronous task in the background safely.
 * Uses Next.js `after()` API when inside a request context to ensure
 * serverless execution containers do not freeze or terminate prematurely.
 * Falls back gracefully to Promise execution if called outside a request context.
 */
function runInBackground(task: () => Promise<void>) {
  try {
    after(task);
  } catch {
    Promise.resolve()
      .then(task)
      .catch((err) => {
        console.error("[runInBackground] Fallback execution error:", err);
      });
  }
}

async function getUserEmailData(userId: string): Promise<{ email: string; name: string; announcementEmailsOptOut: boolean } | null> {
  const user = await withDbErrorHandling(() => prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { email: true, name: true, announcementEmailsOptOut: true }
  }), "Database operation failed");
  return user ? { email: user.email, name: user.name || "", announcementEmailsOptOut: user.announcementEmailsOptOut } : null;
}

function toAbsoluteUrl(href: string): string {
  if (href.startsWith("http")) return href;
  const base = getAppBaseUrl().replace(/\/$/, "");
  return `${base}${href.startsWith("/") ? "" : "/"}${href}`;
}


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
    case "BOOK_ORDER_SHIPPED":
      return "Book order shipped";
    case "BOOK_ORDER_REFUNDED":
      return "Book order refunded";
    case "BLOG_COMMENT_ADDED":
      return "New blog comment";
    default:
      return "Notification";
  }
}

export function notificationTypeClass(type: StudentNotificationType): string {
  switch (type) {
    case "PAYMENT_APPROVED":
    case "ENROLLMENT_APPROVED":
    case "BOOK_ORDER_APPROVED":
      return "bg-success-bg text-success-text";
    case "ENROLLMENT_REJECTED":
    case "BOOK_ORDER_DECLINED":
      return "bg-destructive-bg text-destructive-text";
    case "PERSONAL_MESSAGE":
    case "BOOK_ORDER_SHIPPED":
      return "bg-info-bg text-info-text";
    case "BOOK_ORDER_REFUNDED":
      return "bg-warning-bg text-warning-text";
    case "BLOG_COMMENT_ADDED":
      return "bg-sky-100 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300";
    case "COURSE_ANNOUNCEMENT":
      return "bg-sky-100 dark:bg-sky-950/30 text-sky-800 dark:text-sky-300";
    case "SITE_ANNOUNCEMENT":
      return "bg-warning-bg text-warning-text";
    default:
      return "bg-accent-muted text-foreground";
  }
}

/** Mirrors an in-app notification to the student's devices once the response is sent. */
function pushAfterResponse(userIds: string[], payload: { title: string; body?: string | null; href: string }) {
  runInBackground(() => sendPushToUsers(userIds, payload));
}

export async function createStudentNotification(input: CreateStudentNotificationInput) {
  const { userId, type, title, body, href, sourceType, sourceId } = input;
  pushAfterResponse([userId], { title, body, href });

  if (sourceId) {
    return withDbErrorHandling(() => prisma.studentNotification.upsert({
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
        }), "Database operation failed");
  }

  return withDbErrorHandling(() => prisma.studentNotification.create({
      data: {
        userId,
        type,
        title,
        body: body ?? null,
        href,
        sourceType: sourceType ?? null,
        sourceId: null,
      },
    }), "Database operation failed");
}

export async function createStudentNotificationsForUsers(
  userIds: string[],
  payload: Omit<CreateStudentNotificationInput, "userId">,
) {
  if (userIds.length === 0) return;

  const uniqueUserIds = [...new Set(userIds)];
  const { type, title, body, href, sourceType, sourceId } = payload;
  pushAfterResponse(uniqueUserIds, { title, body, href });

  if (!sourceId) {
    await withDbErrorHandling(() => prisma.studentNotification.createMany({
          data: uniqueUserIds.map((userId) => ({
            userId,
            type,
            title,
            body: body ?? null,
            href,
            sourceType: sourceType ?? null,
            sourceId: null,
          })),
        }), "Database operation failed");
    return;
  }

  // Two statements for any number of recipients: insert the rows that do not
  // exist yet (the (userId, type, sourceId) unique index dedupes), then
  // refresh text and mark unread for everyone, including the ones just added.
  await withDbErrorHandling(() => prisma.studentNotification.createMany({
        data: uniqueUserIds.map((userId) => ({
          userId,
          type,
          title,
          body: body ?? null,
          href,
          sourceType: sourceType ?? null,
          sourceId,
        })),
        skipDuplicates: true,
      }), "Database operation failed");
  await withDbErrorHandling(() => prisma.studentNotification.updateMany({
        where: { userId: { in: uniqueUserIds }, type, sourceId },
        data: { title, body: body ?? null, href, sourceType: sourceType ?? null, readAt: null },
      }), "Database operation failed");
}

type AnnouncementRecipient = {
  id: string;
  email: string;
  name: string | null;
  announcementEmailsOptOut: boolean;
};

const RECIPIENT_SELECT = { id: true, email: true, name: true, announcementEmailsOptOut: true } as const;

/**
 * Students who are in the course: active or completed enrollments of accounts
 * that still exist. Pending, awaiting-fee and rejected requests are not.
 * One query returns everything the in-app and e-mail fan-out needs.
 */
async function getEnrolledStudentRecipientsForCourse(courseId: string): Promise<AnnouncementRecipient[]> {
  return withDbErrorHandling(() => prisma.user.findMany({
      where: {
        deletedAt: null,
        enrollments: {
          some: {
            courseId,
            status: { in: [ENROLLMENT_STATUS.ACTIVE, ENROLLMENT_STATUS.COMPLETED] },
          },
        },
      },
      select: RECIPIENT_SELECT,
    }), "Database operation failed");
}

async function getNonTeacherRecipients(): Promise<AnnouncementRecipient[]> {
  const teachers = await withDbErrorHandling(() => prisma.teacher.findMany({ select: { email: true } }), "Database operation failed");
  const teacherEmails = teachers.flatMap((teacher) =>
    teacher.email ? [teacher.email.toLowerCase()] : [],
  );

  return withDbErrorHandling(() => prisma.user.findMany({
      where: { deletedAt: null, ...(teacherEmails.length > 0 ? { email: { notIn: teacherEmails } } : {}) },
      select: RECIPIENT_SELECT,
    }), "Database operation failed");
}

/** Recipients who get the announcement e-mail as well as the in-app notification. */
function emailRecipients(recipients: AnnouncementRecipient[]): AnnouncementRecipient[] {
  return recipients.filter((recipient) => recipient.email && !recipient.announcementEmailsOptOut);
}

/** How long the after() drain may spend sending; the cron sends the rest. */
const AFTER_RESPONSE_SEND_BUDGET_MS = 20_000;

/**
 * Queues the announcement e-mails before the response, so none is lost if the
 * instance stops, then starts sending them once the response is out. Large
 * audiences are finished by the e-mail-outbox cron.
 */
async function enqueueAnnouncementEmails(messages: DeliverMailParams[]) {
  if (messages.length === 0) return;
  await withDbErrorHandling(() => enqueueEmails(messages), "Database operation failed");
  runInBackground(async () => {
    try {
      await drainOutbox({ budgetMs: AFTER_RESPONSE_SEND_BUDGET_MS });
    } catch (err) {
      console.error("[enqueueAnnouncementEmails] Outbox drain error:", err);
    }
  });
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

  runInBackground(async () => {
    try {
      const user = await getUserEmailData(params.userId);
      if (user && user.email) {
        await sendPaymentApprovedEmail({
          to: user.email,
          studentName: user.name,
          courseTitle: params.courseTitle,
          paymentUrl: toAbsoluteUrl("/profile/payments")
        });
      }
    } catch (err) {
      console.error("[notifyPaymentApproved] Email send error:", err);
    }
  });
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

  runInBackground(async () => {
    try {
      const user = await getUserEmailData(params.userId);
      if (user && user.email) {
        await sendEnrollmentApprovedEmail({
          to: user.email,
          studentName: user.name,
          courseTitle: params.courseTitle,
          courseUrl: toAbsoluteUrl("/profile/courses")
        });
      }
    } catch (err) {
      console.error("[notifyEnrollmentApproved] Email send error:", err);
    }
  });
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

  runInBackground(async () => {
    try {
      const user = await getUserEmailData(params.userId);
      if (user && user.email) {
        await sendEnrollmentRejectedEmail({
          to: user.email,
          studentName: user.name,
          courseTitle: params.courseTitle,
          courseUrl: toAbsoluteUrl("/profile/courses")
        });
      }
    } catch (err) {
      console.error("[notifyEnrollmentRejected] Email send error:", err);
    }
  });
}

export async function notifyEnrolledStudentsOfCourseAnnouncement(params: {
  courseId: string;
  courseTitle: string;
  announcementId: string;
  title: string;
  body: string;
}) {
  const recipients = await getEnrolledStudentRecipientsForCourse(params.courseId);
  await createStudentNotificationsForUsers(recipients.map((recipient) => recipient.id), {
    type: "COURSE_ANNOUNCEMENT",
    title: `${params.courseTitle}: ${params.title}`,
    body: notificationPreview(params.body),
    href: `/profile/courses/${params.courseId}/announcements`,
    sourceType: "CourseAnnouncement",
    sourceId: params.announcementId,
  });

  // One revalidation for the batch; the per-student admin pages are refreshed
  // as a layout rather than one call per recipient.
  revalidateNotificationPaths();
  revalidatePath("/admin/students", "layout");

  const announcementUrl = toAbsoluteUrl(`/profile/courses/${params.courseId}/announcements`);
  await enqueueAnnouncementEmails(
    emailRecipients(recipients).map((recipient) =>
      buildCourseAnnouncementEmail({
        to: recipient.email,
        studentName: recipient.name || "",
        courseTitle: params.courseTitle,
        announcementTitle: params.title,
        announcementBody: params.body,
        announcementUrl,
        unsubscribeUrl: buildUnsubscribeUrl(recipient.id),
      }),
    ),
  );
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

  runInBackground(async () => {
    try {
      const user = await getUserEmailData(params.userId);
      if (user && user.email) {
        await sendPersonalMessageEmail({
          to: user.email,
          studentName: user.name,
          teacherName: params.teacherName,
          courseTitle: params.courseTitle,
          messageTitle: params.title || "New Message",
          messageBody: params.body,
          messageUrl: toAbsoluteUrl(`/profile/courses/${params.courseId}/announcements`)
        });
      }
    } catch (err) {
      console.error("[notifyStudentOfPersonalMessage] Email send error:", err);
    }
  });
}

export async function notifyAllStudentsOfSiteAnnouncement(params: {
  announcementId: string;
  title: string;
  body: string;
}) {
  const recipients = await getNonTeacherRecipients();
  await createStudentNotificationsForUsers(recipients.map((recipient) => recipient.id), {
    type: "SITE_ANNOUNCEMENT",
    title: params.title,
    body: notificationPreview(params.body),
    href: `/announcements/${params.announcementId}`,
    sourceType: "SiteAnnouncement",
    sourceId: params.announcementId,
  });

  revalidatePath("/profile/notifications", "page");
  revalidatePath("/profile", "layout");

  const announcementUrl = toAbsoluteUrl(`/announcements/${params.announcementId}`);
  await enqueueAnnouncementEmails(
    emailRecipients(recipients).map((recipient) =>
      buildSiteAnnouncementEmail({
        to: recipient.email,
        studentName: recipient.name || "",
        announcementTitle: params.title,
        announcementBody: params.body,
        announcementUrl,
        unsubscribeUrl: buildUnsubscribeUrl(recipient.id),
      }),
    ),
  );
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
    withDbErrorHandling(() => prisma.studentNotification.findMany({
            where,
            orderBy: { createdAt: "desc" },
            ...paginationArgs(page, pageSize),
          }), "Database operation failed"),
    withDbErrorHandling(() => prisma.studentNotification.count({ where }), "Database operation failed"),
  ]);

  return { items, totalCount };
}

export async function getNotificationById(
  userId: string,
  notificationId: string,
): Promise<StudentNotification | null> {
  return withDbErrorHandling(() => prisma.studentNotification.findFirst({
      where: { id: notificationId, userId },
    }), "Database operation failed");
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return withDbErrorHandling(() => prisma.studentNotification.count({
      where: { userId, readAt: null },
    }), "Database operation failed");
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const notification = await withDbErrorHandling(() => prisma.studentNotification.findFirst({
      where: { id: notificationId, userId },
    }), "Database operation failed");

  if (!notification) return null;

  if (!notification.readAt) {
    await withDbErrorHandling(() => prisma.studentNotification.update({
          where: { id: notificationId },
          data: { readAt: new Date() },
        }), "Database operation failed");
  }

  revalidateNotificationPaths(userId);
  return notification;
}

export async function markAllNotificationsRead(userId: string) {
  await withDbErrorHandling(() => prisma.studentNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    }), "Database operation failed");
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

  runInBackground(async () => {
    try {
      const user = await getUserEmailData(params.userId);
      if (user && user.email) {
        await sendBookOrderApprovedEmail({
          to: user.email,
          studentName: user.name,
          orderUrl: toAbsoluteUrl("/profile/cart"),
          totalAmountStr: amountStr
        });
      }
    } catch (err) {
      console.error("[notifyBookOrderApproved] Email send error:", err);
    }
  });
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

  runInBackground(async () => {
    try {
      const user = await getUserEmailData(params.userId);
      if (user && user.email) {
        await sendBookOrderDeclinedEmail({
          to: user.email,
          studentName: user.name,
          orderUrl: toAbsoluteUrl("/profile/cart")
        });
      }
    } catch (err) {
      console.error("[notifyBookOrderDeclined] Email send error:", err);
    }
  });
}

export async function notifyBookOrderShipped(params: {
  userId: string;
  orderId: string;
  courierServiceName: string;
  trackingId: string;
}) {
  await createStudentNotification({
    userId: params.userId,
    type: "BOOK_ORDER_SHIPPED",
    title: "Book order shipped",
    body: `Your book order has been shipped via ${params.courierServiceName}. Tracking ID: ${params.trackingId}`,
    href: "/profile/cart",
    sourceType: "BookOrder",
    sourceId: params.orderId,
  });
  revalidateNotificationPaths(params.userId);

  runInBackground(async () => {
    try {
      const user = await getUserEmailData(params.userId);
      if (user && user.email) {
        await sendBookOrderShippedEmail({
          to: user.email,
          studentName: user.name,
          orderUrl: toAbsoluteUrl("/profile/cart"),
          courierServiceName: params.courierServiceName,
          trackingId: params.trackingId
        });
      }
    } catch (err) {
      console.error("[notifyBookOrderShipped] Email send error:", err);
    }
  });
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

  runInBackground(async () => {
    try {
      const user = await getUserEmailData(params.userId);
      if (user && user.email) {
        await sendBookOrderRefundedEmail({
          to: user.email,
          studentName: user.name,
          orderUrl: toAbsoluteUrl("/profile/cart")
        });
      }
    } catch (err) {
      console.error("[notifyBookOrderRefunded] Email send error:", err);
    }
  });
}

