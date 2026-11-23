import { NextRequest, NextResponse } from "next/server";
import { requireStudentApiAuth } from "@/services/api-auth";
import { getNotificationById, markNotificationRead } from "@/services/notifications";
import { apiError, apiServerError } from "@/utils/api-response";

/** One of the caller's notifications; opening it marks it read (as on the website). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, errorResponse } = await requireStudentApiAuth(request);
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const notification = await getNotificationById(user.id, id);
    if (!notification) return apiError("Notification not found.", 404);
    if (!notification.readAt) await markNotificationRead(user.id, id);
    return NextResponse.json({ success: true, notification: { ...notification, readAt: notification.readAt ?? new Date() } });
  } catch (error) {
    return apiServerError("api/v1/notifications/[id]", error, "Failed to fetch the notification.");
  }
}
