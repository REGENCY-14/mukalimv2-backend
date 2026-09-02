import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { roleEnum, userStatusEnum } from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    // Stored lowercased by the app layer — a plain unique index stands in for
    // Postgres's `citext` type so no extra extension is required to run this.
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").notNull(),
    status: userStatusEnum("status").notNull().default("invited"),
    // A Tailwind class token (e.g. "bg-brand-gold"), not a hex value — see
    // the initials-avatar palette already used by the frontend.
    avatarColor: text("avatar_color").notNull().default("bg-brand-gold"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    // Set on invite (POST /api/admin/users, aliased at /api/auth/invite);
    // cleared once accept-invite succeeds. We store a hash of the token,
    // never the token itself — see authService.acceptInvite.
    inviteTokenHash: text("invite_token_hash"),
    inviteTokenExpiresAt: timestamp("invite_token_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
    roleIdx: index("users_role_idx").on(table.role),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
