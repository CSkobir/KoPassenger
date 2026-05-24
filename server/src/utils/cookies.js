import { config } from "../config.js";

export function getCookieBaseOptions() {
  const isProd = config.nodeEnv === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
  };
}
