import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import type { Role } from "../types/auth";

// Mirrors canEdit()/canManageUsers() in the frontend's src/lib/admin/permissions.ts.
// The frontend only *hides* UI for lower roles — these are the real, server-side gates.

export function canEdit(role: Role): boolean {
  return role === "admin" || role === "editor";
}

export function canManageUsers(role: Role): boolean {
  return role === "admin";
}

/** admin or editor — blocks all mutating requests for `viewer`. */
export function requireEditor(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(AppError.unauthenticated());
  if (!canEdit(req.user.role)) return next(AppError.forbidden("Editors or admins only."));
  next();
}

/** admin only — every /admin/users route. */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) return next(AppError.unauthenticated());
  if (!canManageUsers(req.user.role)) return next(AppError.forbidden("Admins only."));
  next();
}
