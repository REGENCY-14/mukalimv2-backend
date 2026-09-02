import { eq } from "drizzle-orm";
import { db } from "../db";
import { settings } from "../db/schema";
import type { UpdateSettingsInput } from "../schemas/settings";
import type { Actor } from "./activityService";
import * as activityService from "./activityService";
import { AppError } from "../utils/errors";

const SETTINGS_ID = 1;

export async function get() {
  const [row] = await db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).limit(1);
  if (!row) throw new AppError(500, "INTERNAL_ERROR", "Settings row is missing — did you run db:seed?");
  return row;
}

export async function update(input: UpdateSettingsInput, actor: Actor) {
  await db
    .update(settings)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(settings.id, SETTINGS_ID));

  await activityService.log(actor, "updated", "site settings");
  return get();
}
