import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import {
  getNotificationsForUserPaginated,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";
import { parseApiPagination } from "@/utils/api-pagination";
import { apiError, apiServerError, INVALID_JSON_MESSAGE, readJson } from "@/utils/api-response";

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = request.nextUrl;
    const { page, pageSize } = parseApiPagination(searchParams);
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
    return apiServerError("api/v1/notifications", error, "Failed to fetch notifications.");
  }
}

export async function PATCH(request: NextRequest) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const body = await readJson(request);
    if (!body) return apiError(INVALID_JSON_MESSAGE, 400);
    const { markAllRead } = body;
    const notificationId = typeof body.notificationId === "string" ? body.notificationId : "";

    if (markAllRead) {
      await markAllNotificationsRead(user.id);
      return NextResponse.json({
        success: true,
        message: "All notifications marked as read.",
      });
    }

    if (!notificationId) {
      return apiError("Notification ID is required.", 400);
    }

    const updated = await markNotificationRead(user.id, notificationId);
    if (!updated) {
      return apiError("Notification not found.", 404);
    }

    return NextResponse.json({
      success: true,
      notification: updated,
    });
  } catch (error) {
    return apiServerError("api/v1/notifications", error, "Failed to update notification.");
  }
}
