import type { Request, Response } from "express";
import { z } from "zod";
import * as authService from "../services/authService";
import * as userService from "../services/userService";
import { inviteUserSchema } from "../schemas/user";
import { setAuthCookies, clearAuthCookies, ACCESS_COOKIE, REFRESH_COOKIE } from "../utils/cookies";
import { AppError } from "../utils/errors";
import { asyncHandler } from "../utils/asyncHandler";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const { user, tokens } = await authService.login(email, password);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.status(200).json({ user });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.status(200).json({});
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw AppError.unauthenticated("No session to refresh.");
  const tokens = await authService.refresh(token);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.status(200).json({});
});

export const session = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  res.status(200).json({ user: req.user });
});

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const acceptInvite = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = acceptInviteSchema.parse(req.body);
  const { user, tokens } = await authService.acceptInvite(token, password);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.status(200).json({ user });
});

// Validated at the route level (validate({ body: forgotPasswordSchema }) /
// resetPasswordSchema), same pattern as login — unlike acceptInvite/invite
// above, which parse inline.
export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  await authService.requestPasswordReset(email);

  // Identical response whether or not the email matches an account — never
  // reveals which addresses are registered. See authService for the actual
  // (also enumeration-safe) logic.
  res.status(200).json({ message: "If an account exists for that email, a password reset link has been sent." });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body;
  const { user, tokens } = await authService.resetPassword(token, password);
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  res.status(200).json({ user });
});

/**
 * Alias for POST /api/admin/users — the same admin-only invite flow, kept
 * reachable under /api/auth/invite too since that's where it's listed in
 * the original endpoint scope. Both routes call userService.invite.
 */
export const invite = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthenticated();
  const input = inviteUserSchema.parse(req.body);
  const { user, emailSent, inviteToken } = await userService.invite(input, { id: req.user.id, role: req.user.role });

  // inviteToken is only present when emailSent is false (Resend not
  // configured, or the send failed) — a fallback so the admin can still
  // deliver the link manually. See userService.invite / utils/email.ts.
  res.status(201).json({ user, emailSent, inviteToken });
});
