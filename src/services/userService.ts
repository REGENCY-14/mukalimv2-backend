import crypto from "node:crypto";
import { eq, ne, and, sql } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { AppError } from "../utils/errors";
import { hashPassword } from "../utils/password";
import { countOf } from "../utils/rows";
import type { InviteUserInput, UpdateUserInput } from "../schemas/user";
import type { Actor } from "./activityService";
import * as activityService from "./activityService";
import * as authService from "./authService";

const AVATAR_COLORS = ["bg-brand-gold", "bg-brand-brown", "bg-admin-terracotta", "bg-brand-ink"];

function pickAvatarColor(): string {
  return AVATAR_COLORS[crypto.randomInt(AVATAR_COLORS.length)] as string;
}

function toPublic(row: typeof users.$inferSelect) {
  const { passwordHash, inviteTokenHash, inviteTokenExpiresAt, ...rest } = row;
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

  // No password yet — set on accept-invite. A random, never-returned hash
  // is stored as a placeholder so the NOT NULL column is satisfiable.
  const placeholderHash = await hashPassword(crypto.randomBytes(24).toString("hex"));

  const [row] = await db
    .insert(users)
    .values({
      name: input.name,
      email,
      passwordHash: placeholderHash,
      role: input.role,
      status: "invited",
      avatarColor: pickAvatarColor(),
    })
    .returning();
  if (!row) throw new AppError(500, "INTERNAL_ERROR", "Failed to create user.");

  const inviteToken = await authService.issueInviteToken(row.id);
  await activityService.log(actor, "invited", `'${input.name}' (${input.role})`);

  // The caller (controller) decides how to deliver inviteToken — email in a
  // real deployment; returned directly here since there's no mail
  // integration in this scaffold (see README's "Auth notes").
  return { user: toPublic(row), inviteToken };
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
