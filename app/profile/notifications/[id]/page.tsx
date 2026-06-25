import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-actions";
import {
  getNotificationById,
  notificationTypeClass,
  notificationTypeLabel,
} from "@/lib/notifications";

function formatFullTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relatedPageLabel(href: string): string | null {
  const path = href.split("?")[0];
  if (path === "/profile/notifications" || path === "") return null;
  if (path.startsWith("/profile/payments")) return "View in Payments";
  if (path.includes("/announcements")) return "View announcement";
  if (path.startsWith("/profile/courses")) return "View in My Courses";
  if (path.startsWith("/profile/cart") || path.startsWith("/bookstore")) return "View order";
  return "View related page";
}

export default async function NotificationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireUser();
  const { id } = await params;
  const notification = await getNotificationById(session.user.id, id);

  if (!notification) {
    notFound();
  }

  const unread = !notification.readAt;
  const relatedLabel = notification.href ? relatedPageLabel(notification.href) : null;

  return (
    <div>
      <Link
        href="/profile/notifications"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary-light"
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Back to notifications
      </Link>

      <article className="card-elevated mt-6 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium leading-tight ${notificationTypeClass(
              notification.type,
            )}`}
          >
            {notificationTypeLabel(notification.type)}
          </span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              unread ? "bg-primary/10 text-primary" : "bg-accent-muted text-muted"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${unread ? "bg-primary" : "bg-muted"}`}
              aria-hidden
            />
            {unread ? "Unread" : "Read"}
          </span>
        </div>

        <h1 className="mt-4 font-serif text-xl font-semibold text-foreground sm:text-2xl">
          {notification.title}
        </h1>

        <p className="mt-2 text-sm text-muted">
          <time dateTime={notification.createdAt.toISOString()}>
            {formatFullTime(notification.createdAt)}
          </time>
        </p>

        {notification.body ? (
          <div className="mt-6 border-t border-border/60 pt-6">
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {notification.body}
            </p>
          </div>
        ) : (
          <div className="mt-6 border-t border-border/60 pt-6">
            <p className="text-sm italic text-muted">No additional details for this notification.</p>
          </div>
        )}

        {relatedLabel && (
          <div className="mt-8 border-t border-border/60 pt-6">
            <Link
              href={notification.href}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-light"
            >
              {relatedLabel}
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          </div>
        )}
      </article>
    </div>
  );
}
