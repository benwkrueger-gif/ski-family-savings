import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "./index";
import { appSettings, pipelineLogs } from "./schema";

export async function getSetting(key: string): Promise<string | undefined> {
  const db = getDb();
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return rows[0]?.value;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function addPipelineLog(reportId: string, stage: string, message: string): Promise<void> {
  const db = getDb();
  await db.insert(pipelineLogs).values({
    id: randomUUID(),
    reportId,
    stage,
    message,
  });
}
