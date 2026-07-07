import type { StudentNotification, StudentNotificationType } from "@prisma/client";
import {
  notificationTypeClass,
  notificationTypeLabel,
} from "@/services/notifications";
import { viewNotification } from "@/app/profile/notifications/actions";

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function formatFullTime(date: Date): string {
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function notificationIconClass(type: StudentNotificationType): string {
  switch (type) {
    case "PAYMENT_APPROVED":
    case "ENROLLMENT_APPROVED":
      return "bg-success-bg text-success-text ring-success-text/30";
    case "ENROLLMENT_REJECTED":
      return "bg-destructive-bg text-destructive-text ring-destructive-text/30";
    case "PERSONAL_MESSAGE":
      return "bg-info-bg text-violet-700 dark:text-violet-300 ring-violet-200/80 dark:ring-violet-800/30";
    case "COURSE_ANNOUNCEMENT":
      return "bg-sky-100 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 ring-sky-200/80 dark:ring-sky-800/30";
    case "SITE_ANNOUNCEMENT":
      return "bg-warning-bg text-warning-text ring-amber-200/80 dark:ring-amber-800/30";
    default:
      return "bg-accent-muted text-foreground ring-border";
  }
}

function NotificationIcon({ type }: { type: StudentNotificationType }) {
  const className = "h-4 w-4";

  switch (type) {
    case "PAYMENT_APPROVED":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "ENROLLMENT_APPROVED":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      );
    case "ENROLLMENT_REJECTED":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
      );
    case "COURSE_ANNOUNCEMENT":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 3.34a1.125 1.125 0 0 1 1.32 0l6.4 4.6a1.125 1.125 0 0 1-.66 2.06H4.6a1.125 1.125 0 0 1-.66-2.06l6.4-4.6Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 8.25v8.25A2.25 2.25 0 0 0 8.25 18.75h7.5A2.25 2.25 0 0 0 18 16.5V8.25" />
        </svg>
      );
    case "PERSONAL_MESSAGE":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375m-13.5 3.75c0 2.278 4.365 4.125 9.75 4.125s9.75-1.847 9.75-4.125V6.375c0-2.278-4.365-4.125-9.75-4.125S2.25 4.097 2.25 6.375v6.75Z" />
        </svg>
      );
    case "SITE_ANNOUNCEMENT":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
      );
  }
}

export function NotificationCard({ notification }: { notification: StudentNotification }) {
  const unread = !notification.readAt;

  return (
    <li className="h-full">
      <form action={viewNotification.bind(null, notification.id)} className="h-full">
        <button
          type="submit"
          aria-label={`View notification: ${notification.title}`}
          className={`group card-elevated flex h-full w-full flex-col overflow-hidden p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
            unread
              ? "ring-2 ring-primary/15 bg-gradient-to-b from-violet-50/90 to-surface dark:from-violet-950/20 dark:to-surface"
              : "opacity-95 hover:opacity-100"
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 ${notificationIconClass(notification.type)}`}
            >
              <NotificationIcon type={notification.type} />
            </div>
            {unread && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-ui-xs font-semibold text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                New
              </span>
            )}
          </div>

          <span
            className={`mt-3 inline-flex w-fit rounded-full px-2 py-0.5 text-ui-xs font-medium leading-tight ${notificationTypeClass(notification.type)}`}
          >
            {notificationTypeLabel(notification.type)}
          </span>

          <h3
            className={`mt-2 line-clamp-2 font-serif text-sm leading-snug ${
              unread ? "font-semibold text-foreground" : "font-medium text-foreground/90"
            }`}
          >
            {notification.title}
          </h3>

          {notification.body && (
            <p className="mt-1.5 line-clamp-2 flex-1 text-xs leading-relaxed text-muted">
              {notification.body}
            </p>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <time
              className="text-ui-xs text-muted"
              dateTime={notification.createdAt.toISOString()}
              title={formatFullTime(notification.createdAt)}
            >
              {formatRelativeTime(notification.createdAt)}
            </time>
            <span className="inline-flex items-center gap-0.5 text-xs font-medium text-primary transition-colors group-hover:text-primary-light">
              View Notification
              <svg
                className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </span>
          </div>
        </button>
      </form>
    </li>
  );
}
