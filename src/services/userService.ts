import crypto from "node:crypto";
import { eq, ne, and, sql } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { AppError } from "../utils/errors";
import { hashPassword } from "../utils/password";
import { countOf } from "../utils/rows";
import { sendInviteEmail } from "../utils/email";
import type { InviteUserInput, UpdateUserInput } from "../schemas/user";
import type { Actor } from "./activityService";
import * as activityService from "./activityService";
import * as authService from "./authService";

const AVATAR_COLORS = ["bg-brand-gold", "bg-brand-brown", "bg-admin-terracotta", "bg-brand-ink"];

function pickAvatarColor(): string {
  return AVATAR_COLORS[crypto.randomInt(AVATAR_COLORS.length)] as string;
}

/** Invites can be sent with just an email — this derives a readable
 * placeholder name from the local part (e.g. "amara.osei" -> "Amara Osei")
 * for invites that don't include one. Correctable later via PATCH
 * /api/admin/users/:id. */
export function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const words = local
    .replace(/[._-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));
  return words.join(" ") || "New User";
}

function toPublic(row: typeof users.$inferSelect) {
  // resetTokenHash/resetTokenExpiresAt were added for forgot-password after
  // this function was written, and missed being added here — caught during
  // the security audit's drizzle-orm upgrade smoke test (GET /admin/users
  // was leaking resetTokenHash to admin callers). Just a hash, and only
  // exposed to already-privileged admins, but internal security artifacts
  // like this shouldn't leave the service layer at all.
  const { passwordHash, inviteTokenHash, inviteTokenExpiresAt, resetTokenHash, resetTokenExpiresAt, ...rest } = row;
  return rest;
}

export async function list() {
  const rows = await db.select().from(users).orderBy(users.createdAt);
  return rows.map(toPublic);
}

export async function invite(input: InviteUserInput, actor: Actor) {
  const email = input.email.toLowerCase();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing) throw AppError.conflict("A user with this email already exists.");

  const name = input.name?.trim() || deriveNameFromEmail(email);

  // No password yet — set on accept-invite. A random, never-returned hash
  // is stored as a placeholder so the NOT NULL column is satisfiable.
  const placeholderHash = await hashPassword(crypto.randomBytes(24).toString("hex"));

  const [row] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: placeholderHash,
      role: input.role,
      status: "invited",
      avatarColor: pickAvatarColor(),
    })
    .returning();
  if (!row) throw new AppError(500, "INTERNAL_ERROR", "Failed to create user.");

  const inviteToken = await authService.issueInviteToken(row.id);
  await activityService.log(actor, "invited", `'${name}' (${input.role})`);

  // Actually email the invite link. If Resend isn't configured or the send
  // fails for any reason, don't fail the whole invite — the user row and
  // token already exist — fall back to returning the raw token so the
  // caller (admin) can still deliver it manually.
  let emailSent = false;
  try {
    const messageId = await sendInviteEmail(email, name, inviteToken, input.role);
    emailSent = true;
    console.log(`[userService.invite] Invite email sent to ${email} (Resend message id: ${messageId})`);
  } catch (err) {
    console.error(`[userService.invite] Failed to send invite email to ${email}:`, err);
  }

  return { user: toPublic(row), emailSent, inviteToken: emailSent ? undefined : inviteToken };
}

export async function update(id: string, input: UpdateUserInput, actor: Actor) {
  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) throw AppError.notFound("User not found.");

  if (input.role && input.role !== "admin" && existing.role === "admin") {
    await assertNotLastAdmin(id, "change the role of");
  }
  if (input.status === "disabled" && existing.role === "admin") {
    await assertNotLastAdmin(id, "disable");
  }

  await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, id));

  await activityService.log(actor, "updated", `'${existing.name}'`);
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) throw AppError.notFound("User not found.");
  return toPublic(row);
}

async function assertNotLastAdmin(excludeId: string, verb: string) {
  const countRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.role, "admin"), ne(users.id, excludeId), ne(users.status, "disabled")));
  if (countOf(countRows) === 0) throw AppError.conflict(`Cannot ${verb} the last remaining admin.`);
}

export async function remove(id: string, actor: Actor) {
  if (id === actor.id) throw AppError.forbidden("You cannot delete your own account.");

  const [existing] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!existing) throw AppError.notFound("User not found.");

  if (existing.role === "admin") await assertNotLastAdmin(id, "delete");

  await db.delete(users).where(eq(users.id, id));
  await activityService.log(actor, "removed", `'${existing.name}'`);
}
