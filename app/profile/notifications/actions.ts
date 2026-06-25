"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-actions";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

export async function viewNotification(notificationId: string) {
  const session = await requireUser();
  const notification = await markNotificationRead(session.user.id, notificationId);

  if (!notification) {
    redirect("/profile/notifications");
  }

  redirect(`/profile/notifications/${notificationId}`);
}

export async function markAllNotificationsReadAction() {
  const session = await requireUser();
  await markAllNotificationsRead(session.user.id);
  revalidatePath("/profile/notifications");
  redirect("/profile/notifications");
}
