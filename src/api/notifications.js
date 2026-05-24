import { api, parseJson } from "./client.js";

export async function fetchNotifications() {
  const res = await api("/api/notifications");
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not fetch notifications");
  return body.notifications;
}

export async function markNotificationRead(id) {
  const res = await api(`/api/notifications/${id}/read`, { method: "PATCH" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not mark notification as read");
  return body.notification;
}

export async function markAllNotificationsRead() {
  const res = await api("/api/notifications/read-all", { method: "PATCH" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not mark all as read");
  return body.message;
}
