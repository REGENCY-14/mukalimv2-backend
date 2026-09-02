import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { roleEnum } from "./enums";
import { users } from "./users";

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Snapshot the role *at the time of the action* — the dev-only "preview
    // as" role switcher can change a session's effective role without
    // changing the underlying user.
    actorRole: roleEnum("actor_role").notNull(),
    // Short verb phrase, e.g. "created the", "updated", "set to draft",
    // "uploaded", "invited", "removed" — the frontend concatenates
    // actor + action + target directly into a sentence, keep these stable.
    action: text("action").notNull(),
    // Human-readable target, e.g. "'Turmeric: The Golden Healer'".
    targetLabel: text("target_label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("activity_log_created_at_idx").on(table.createdAt),
  }),
);

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type NewActivityLogEntry = typeof activityLog.$inferInsert;
