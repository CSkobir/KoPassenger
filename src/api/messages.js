import { api, parseJson } from "./client.js";

const BASE = "/api/messages";

export async function getConversations() {
  const res = await api(`${BASE}/conversations`);
  if (!res.ok) throw new Error("Failed to load conversations");
  return parseJson(res);
}

export async function getMessages(rideRequestId) {
  const res = await api(`${BASE}/${rideRequestId}`);
  if (!res.ok) throw new Error("Failed to load messages");
  return parseJson(res);
}

export async function sendMessage(rideRequestId, content) {
  const res = await api(`${BASE}/${rideRequestId}`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return parseJson(res);
}

export async function markRead(rideRequestId) {
  await api(`${BASE}/${rideRequestId}/read`, { method: "PATCH" });
}
