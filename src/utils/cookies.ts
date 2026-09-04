import type { Response } from "express";

const ACCESS_COOKIE = "mukalim_access";
const REFRESH_COOKIE = "mukalim_refresh";

const isProd = process.env.NODE_ENV === "production";
const secure = process.env.COOKIE_SECURE === "true" || isProd;
const domain = process.env.COOKIE_DOMAIN || undefined;
// Frontend (Vercel) and backend (Render) live on different domains in
// production, so the cookie is cross-site from the browser's point of view —
// that requires SameSite=None, which browsers only honor when Secure is
// also set (guaranteed above: isProd implies secure=true). Local dev keeps
// Lax since frontend/backend are both on localhost there.
const sameSite = isProd ? ("none" as const) : ("lax" as const);

function accessMaxAgeMs(): number {
  return 15 * 60 * 1000; // matches JWT_ACCESS_EXPIRES_IN default (15m); token itself is the source of truth
}

function refreshMaxAgeMs(): number {
  return 30 * 24 * 60 * 60 * 1000; // matches JWT_REFRESH_EXPIRES_IN default (30d)
}

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    maxAge: accessMaxAgeMs(),
    path: "/",
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    domain,
    maxAge: refreshMaxAgeMs(),
    path: "/api/auth",
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_COOKIE, { path: "/", domain });
  res.clearCookie(REFRESH_COOKIE, { path: "/api/auth", domain });
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
