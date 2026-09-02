import { desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { activityLog, users } from "../db/schema";
import type { Role } from "../types/auth";
import { parsePageParams, buildMeta } from "../utils/pagination";
import { countOf } from "../utils/rows";

export interface Actor {
  id: string;
  role: Role;
}

/**
 * Writes one activity_log row. Every mutating service call below invokes
 * this alongside its main effect — mirrors how every mutation in the
 * frontend's AdminDataContext.tsx pushes onto the same `activity` array.
 */
export async function log(actor: Actor, action: string, targetLabel: string): Promise<void> {
  await db.insert(activityLog).values({
    actorUserId: actor.id,
    actorRole: actor.role,
    action,
    targetLabel,
  });
}

export async function listActivity(query: Record<string, unknown>) {
  // The topbar notification panel wants 6, the dashboard page wants more —
  // same endpoint, driven purely by `limit` (defaults generously for the page view).
  const { page, limit } = parsePageParams(query, 50);
  const offset = (page - 1) * limit;

  const [rows, countRows] = await Promise.all([
    db
      .select({
        id: activityLog.id,
        actorUserId: activityLog.actorUserId,
        actorName: users.name,
        actorRole: activityLog.actorRole,
        action: activityLog.action,
        targetLabel: activityLog.targetLabel,
        createdAt: activityLog.createdAt,
      })
      .from(activityLog)
      .leftJoin(users, eq(users.id, activityLog.actorUserId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` }).from(activityLog),
  ]);

  return { data: rows, meta: buildMeta(countOf(countRows), { page, limit }) };
}
