import { SubmitButton } from "@/components/shared/SubmitButton";
import Link from "next/link";
import { NotificationList } from "@/components/profile/NotificationList";
import { Pagination } from "@/components/shared/Pagination";
import { requireUser } from "@/services/auth-actions";
import { getNotificationsForUserPaginated, getUnreadNotificationCount } from "@/services/notifications";
import { clampPage, parsePaginationParams } from "@/utils/pagination";
import { markAllNotificationsReadAction } from "./actions";

export default async function ProfileNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>;
}) {
  const session = await requireUser();
  const params = await searchParams;
  const filter = params.filter === "unread" ? "unread" : "all";
  const { page: requestedPage, pageSize } = parsePaginationParams(params);

  const [paginated, unreadCount] = await Promise.all([
    getNotificationsForUserPaginated(session.user.id, requestedPage, pageSize, filter),
    getUnreadNotificationCount(session.user.id),
  ]);

  const page = clampPage(requestedPage, paginated.totalCount, pageSize);
  const filterHref = (nextFilter: "all" | "unread") =>
    nextFilter === "all" ? "/profile/notifications" : "/profile/notifications?filter=unread";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg font-semibold text-foreground">Notifications</h2>
          <p className="mt-1 text-sm text-muted">
            Updates about payments, enrollments, announcements, and messages from your teachers.
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton
              type="submit"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent-muted/50"
            >
              Mark all as read
            </SubmitButton>
          </form>
        )}
      </div>

      <nav
        className="mt-6 flex flex-wrap gap-2"
        aria-label="Notification filters"
      >
        <Link
          href={filterHref("all")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-primary text-white"
              : "border border-border text-foreground hover:bg-accent-muted/50"
          }`}
        >
          All
        </Link>
        <Link
          href={filterHref("unread")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            filter === "unread"
              ? "bg-primary text-white"
              : "border border-border text-foreground hover:bg-accent-muted/50"
          }`}
        >
          Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Link>
      </nav>

      <div className="mt-8">
        <NotificationList
          notifications={paginated.items}
          emptyMessage={
            filter === "unread" ? "No unread notifications." : "No notifications yet."
          }
        />
      </div>

      {paginated.totalCount > pageSize && (
        <div className="mt-8">
          <Pagination
            page={page}
            totalCount={paginated.totalCount}
            pageSize={pageSize}
            basePath="/profile/notifications"
            params={filter === "unread" ? { filter: "unread", page: params.page } : { page: params.page }}
          />
        </div>
      )}
    </div>
  );
}
