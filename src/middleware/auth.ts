import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { verifyAccessToken } from "../utils/jwt";
import { ACCESS_COOKIE } from "../utils/cookies";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/asyncHandler";
import type { AuthUser } from "../types/auth";

// Populates req.user when a valid access-token cookie is present; never
// rejects the request itself. Use `requireAuth` after this to enforce it.
export const attachUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const [row] = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, status: users.status })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (row && row.status !== "disabled") {
      const authUser: AuthUser = { id: row.id, name: row.name, email: row.email, role: row.role };
      req.user = authUser;
    }
  } catch {
    // Invalid/expired token — treat as unauthenticated, let requireAuth (if any) reject it.
  }
  next();
});

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(AppError.unauthenticated());
  next();
}
