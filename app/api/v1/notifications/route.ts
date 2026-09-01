import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import {
  getNotificationsForUserPaginated,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const filter = (searchParams.get("filter") as "all" | "unread") || "all";

    const [paginated, unreadCount] = await Promise.all([
      getNotificationsForUserPaginated(user.id, page, pageSize, filter),
      getUnreadNotificationCount(user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: paginated.items,
      totalCount: paginated.totalCount,
      unreadCount,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("[api/v1/notifications] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const { notificationId, markAllRead } = body;

    if (markAllRead) {
      await markAllNotificationsRead(user.id);
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read.",
      });
    }

    if (!notificationId) {
      return NextResponse.json(
        { success: false, error: "Notification ID is required." },
        { status: 400 }
      );
    }

    const updated = await markNotificationRead(user.id, notificationId);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Notification not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      notification: updated,
    });
  } catch (error) {
    console.error("[api/v1/notifications] PATCH Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update notification." },
      { status: 500 }
    );
  }
}
