import { api, parseJson } from "./client.js";

export async function getPublicProfile(userId) {
  const res = await api(`/api/users/${userId}/public`);
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not load public profile");
  return body; // { user, reviews }
}
