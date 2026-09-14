import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { hashPassword, verifyPassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { AppError } from "../utils/errors";
import { sendPasswordResetEmail } from "../utils/email";
import type { AuthUser, Role } from "../types/auth";
import * as activityService from "./activityService";

function toAuthUser(row: { id: string; name: string; email: string; role: Role }): AuthUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export async function login(email: string, password: string): Promise<{ user: AuthUser; tokens: Tokens }> {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);

  // Same 401 for "no such user" and "wrong password" — the frontend shows one
  // generic invalid-credentials message either way (SignInForm.tsx).
  if (!row || row.status === "disabled") throw new AppError(401, "UNAUTHENTICATED", "Invalid email or password.");

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) throw new AppError(401, "UNAUTHENTICATED", "Invalid email or password.");

  await db.update(users).set({ lastLoginAt: new Date(), status: "active" }).where(eq(users.id, row.id));

  const tokens: Tokens = {
    accessToken: signAccessToken(row.id, row.role),
    refreshToken: signRefreshToken(row.id),
  };

  return { user: toAuthUser(row), tokens };
}

export async function refresh(refreshToken: string): Promise<Tokens> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw AppError.unauthenticated("Invalid or expired session — please sign in again.");
  }

  const [row] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
  if (!row || row.status === "disabled") throw AppError.unauthenticated();

  return {
    accessToken: signAccessToken(row.id, row.role),
    refreshToken: signRefreshToken(row.id),
  };
}

export async function getSession(userId: string): Promise<AuthUser> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) throw AppError.unauthenticated();
  return toAuthUser(row);
}

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Returns the raw invite token — caller (controller) is responsible for
 * delivering it out-of-band (email link) rather than ever storing it. */
export async function issueInviteToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await db
    .update(users)
    .set({ inviteTokenHash: hashToken(token), inviteTokenExpiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS) })
    .where(eq(users.id, userId));
  return token;
}

export async function acceptInvite(token: string, password: string): Promise<{ user: AuthUser; tokens: Tokens }> {
  const tokenHash = hashToken(token);
  const [row] = await db.select().from(users).where(eq(users.inviteTokenHash, tokenHash)).limit(1);

  if (!row || !row.inviteTokenExpiresAt || row.inviteTokenExpiresAt.getTime() < Date.now()) {
    throw AppError.badRequest("This invite link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(users)
    .set({ passwordHash, status: "active", inviteTokenHash: null, inviteTokenExpiresAt: null, lastLoginAt: new Date() })
    .where(eq(users.id, row.id));

  await activityService.log({ id: row.id, role: row.role }, "accepted the invite for", `'${row.name}'`);

  return {
    user: toAuthUser(row),
    tokens: { accessToken: signAccessToken(row.id, row.role), refreshToken: signRefreshToken(row.id) },
  };
}

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour — shorter-lived than invites, standard for reset links

/**
 * Always resolves the same way regardless of whether the email matches an
 * account — the controller returns one generic "check your email" response
 * either way, so this never gives a caller a way to tell which emails are
 * registered. Silently does nothing for unknown or disabled accounts.
 *
 * Unlike issueInviteToken, this does NOT return the raw token to its
 * caller — it's emailed directly and only ever exists in memory here. The
 * API caller is the alleged account owner themselves, not a trusted admin
 * acting on someone else's behalf, so there's no safe way to expose a
 * fallback token if the email fails to send (that would let anyone "reset"
 * any address's password without ever proving inbox access) — a failed
 * send is only logged server-side.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const [row] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
  if (!row || row.status === "disabled") return;

  const token = crypto.randomBytes(32).toString("hex");
  await db
    .update(users)
    .set({ resetTokenHash: hashToken(token), resetTokenExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) })
    .where(eq(users.id, row.id));

  try {
    const messageId = await sendPasswordResetEmail(row.email, row.name, token);
    console.log(`[authService.requestPasswordReset] Reset email sent to ${row.email} (Resend message id: ${messageId})`);
  } catch (err) {
    console.error(`[authService.requestPasswordReset] Failed to send reset email to ${row.email}:`, err);
  }
}

export async function resetPassword(token: string, password: string): Promise<{ user: AuthUser; tokens: Tokens }> {
  const tokenHash = hashToken(token);
  const [row] = await db.select().from(users).where(eq(users.resetTokenHash, tokenHash)).limit(1);

  // Also re-checks disabled here (not just at request time) — status could
  // change between the two steps, and a disabled account shouldn't be able
  // to regain access via a reset link issued before it was disabled.
  if (!row || !row.resetTokenExpiresAt || row.resetTokenExpiresAt.getTime() < Date.now() || row.status === "disabled") {
    throw AppError.badRequest("This password reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(users)
    .set({
      passwordHash,
      // Proving inbox access + setting a real password activates the
      // account the same way accept-invite does — covers an "invited" user
      // who uses forgot-password instead of ever completing accept-invite.
      status: "active",
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      lastLoginAt: new Date(),
    })
    .where(eq(users.id, row.id));

  await activityService.log({ id: row.id, role: row.role }, "reset the password for", `'${row.name}'`);

  return {
    user: toAuthUser(row),
    tokens: { accessToken: signAccessToken(row.id, row.role), refreshToken: signRefreshToken(row.id) },
  };
}
