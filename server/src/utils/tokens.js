import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config.js";

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: Math.floor(config.accessTokenExpiresMs / 1000),
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: Math.floor(config.refreshTokenExpiresMs / 1000),
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwtRefreshSecret);
}

export function randomTokenBytes(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
