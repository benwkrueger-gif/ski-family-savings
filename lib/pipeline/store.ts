import { randomUUID } from "crypto";
import { and, desc, eq, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { addPipelineLog } from "@/lib/db/settings";
import { customerReports, webhookEvents, type CustomerReport } from "@/lib/db/schema";
import type { FamilyProfile } from "@/lib/family/profile";
import { JOB_STALE_MS, jobConflict } from "@/lib/pipeline/artifacts";
import {
  CRON_RECOVERABLE_RESEARCH_STATUSES,
  RESEARCHING_STATUSES,
  type OfferMode,
  type PipelineStatus,
} from "@/lib/pipeline/status";

export async function getReportById(id: string): Promise<CustomerReport | undefined> {
  const db = getDb();
  const rows = await db.select().from(customerReports).where(eq(customerReports.id, id)).limit(1);
  return rows[0];
}

export async function getReportByTallySubmissionId(
  tallySubmissionId: string,
): Promise<CustomerReport | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(customerReports)
    .where(eq(customerReports.tallySubmissionId, tallySubmissionId))
    .limit(1);
  return rows[0];
}

export async function getReportByOpenAiResponseId(
  responseId: string,
): Promise<CustomerReport | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(customerReports)
    .where(eq(customerReports.openaiResponseId, responseId))
    .limit(1);
  return rows[0];
}

export async function listReports(): Promise<CustomerReport[]> {
  const db = getDb();
  return db.select().from(customerReports).orderBy(desc(customerReports.submittedAt), desc(customerReports.createdAt));
}

export async function claimWebhookEvent(options: {
  provider: string;
  eventId: string;
  reportId?: string;
  payload?: unknown;
}): Promise<boolean> {
  const db = getDb();
  try {
    await db.insert(webhookEvents).values({
      id: randomUUID(),
      provider: options.provider,
      eventId: options.eventId,
      reportId: options.reportId,
      payload: options.payload as object | undefined,
    });
    return true;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code) : "";
    const message = error instanceof Error ? error.message : "";
    if (code === "23505" || /unique|duplicate/i.test(message)) return false;
    throw error;
  }
}

export async function upsertFromTally(options: {
  tallySubmissionId: string;
  tallyFormId?: string | null;
  tallyEventId?: string | null;
  rawTallyJson: unknown;
  profile: FamilyProfile;
  submittedAt?: Date | null;
  autoResearch: boolean;
  source: "webhook" | "import";
}): Promise<{ report: CustomerReport; created: boolean }> {
  const existing = await getReportByTallySubmissionId(options.tallySubmissionId);
  const db = getDb();
  const now = new Date();

  if (existing) {
    const familySummary = [
      options.profile.adultsCount != null ? `${options.profile.adultsCount} adults` : null,
      options.profile.children.length ? `${options.profile.children.length} kids` : null,
      options.profile.homeZip,
      options.profile.likelyDestinations.slice(0, 2).join(", ") || null,
    ]
      .filter(Boolean)
      .join(" · ");

    const [updated] = await db
      .update(customerReports)
      .set({
        tallyFormId: options.tallyFormId ?? existing.tallyFormId,
        tallyEventId: options.tallyEventId ?? existing.tallyEventId,
        rawTallyJson: options.rawTallyJson as object,
        familyProfile: { ...options.profile, internalId: existing.id },
        firstName: options.profile.firstName,
        email: options.profile.email,
        homeZip: options.profile.homeZip,
        familySummary,
        submittedAt: options.submittedAt ?? existing.submittedAt,
        deletedAt: existing.deletedAt,
        initialReportSentAt: existing.initialReportSentAt,
        initialReportDeliveryType: existing.initialReportDeliveryType,
        updatedAt: now,
      })
      .where(eq(customerReports.id, existing.id))
      .returning();

    return { report: updated ?? existing, created: false };
  }

  const id = options.profile.internalId || randomUUID();
  try {
    const [created] = await db
      .insert(customerReports)
      .values({
        id,
        tallyFormId: options.tallyFormId,
        tallySubmissionId: options.tallySubmissionId,
        tallyEventId: options.tallyEventId,
        rawTallyJson: options.rawTallyJson as object,
        familyProfile: { ...options.profile, internalId: id },
        firstName: options.profile.firstName,
        email: options.profile.email,
        homeZip: options.profile.homeZip,
        familySummary: [
          options.profile.adultsCount != null ? `${options.profile.adultsCount} adults` : null,
          options.profile.children.length ? `${options.profile.children.length} kids` : null,
          options.profile.homeZip,
          options.profile.likelyDestinations.slice(0, 2).join(", ") || null,
        ]
          .filter(Boolean)
          .join(" · "),
        submittedAt: options.submittedAt ?? now,
        status: "RECEIVED",
        autoResearch: options.autoResearch,
        source: options.source,
        stripeClientReferenceId: id,
        receivedAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    await addPipelineLog(id, "RECEIVED", `Submission ${options.tallySubmissionId} stored`);
    return { report: created, created: true };
  } catch (error) {
    const raced = await getReportByTallySubmissionId(options.tallySubmissionId);
    if (raced) return { report: raced, created: false };
    throw error;
  }
}

export async function updateReport(
  id: string,
  patch: Partial<typeof customerReports.$inferInsert>,
): Promise<CustomerReport> {
  const db = getDb();
  const [updated] = await db
    .update(customerReports)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(customerReports.id, id))
    .returning();
  if (!updated) throw new Error(`Report ${id} not found`);
  return updated;
}

export async function claimConfirmationDelivery(id: string): Promise<CustomerReport | null> {
  const db = getDb();
  const now = new Date();
  const [claimed] = await db
    .update(customerReports)
    .set({
      confirmationStatus: "SENDING",
      confirmationAttemptedAt: now,
      confirmationError: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(customerReports.id, id),
        eq(customerReports.source, "webhook"),
        isNull(customerReports.confirmationStatus),
      ),
    )
    .returning();
  return claimed ?? null;
}

export async function markConfirmationSent(
  id: string,
  gmailMessageId: string,
): Promise<CustomerReport> {
  return updateReport(id, {
    confirmationStatus: "SENT",
    gmailConfirmationMessageId: gmailMessageId,
    confirmationSentAt: new Date(),
    confirmationError: null,
  });
}

export async function markConfirmationUncertain(id: string, error: unknown): Promise<CustomerReport> {
  const message = error instanceof Error ? error.message : String(error);
  return updateReport(id, {
    confirmationStatus: "UNCERTAIN",
    confirmationError: message.slice(0, 2000),
  });
}

export async function markError(id: string, status: PipelineStatus, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  await updateReport(id, {
    status,
    lastError: message.slice(0, 2000),
    lastErrorAt: new Date(),
  });
  await addPipelineLog(id, status, message.slice(0, 2000));
}

export async function setStatus(id: string, status: PipelineStatus, message?: string): Promise<CustomerReport> {
  const updated = await updateReport(id, { status, lastError: null });
  if (message) await addPipelineLog(id, status, message);
  return updated;
}

export async function listActiveResearchReports(): Promise<CustomerReport[]> {
  const db = getDb();
  return db
    .select()
    .from(customerReports)
    .where(inArray(customerReports.status, RESEARCHING_STATUSES))
    .orderBy(desc(customerReports.researchStartedAt), desc(customerReports.updatedAt));
}

export async function listWaitingResearchReports(): Promise<CustomerReport[]> {
  const db = getDb();
  return db
    .select()
    .from(customerReports)
    .where(
      and(
        eq(customerReports.status, "RECEIVED"),
        eq(customerReports.autoResearch, true),
        isNull(customerReports.researchJson),
        isNull(customerReports.deletedAt),
      ),
    )
    .orderBy(customerReports.receivedAt, customerReports.createdAt);
}

export async function listRecoverableResearchReports(): Promise<CustomerReport[]> {
  const db = getDb();
  return db
    .select()
    .from(customerReports)
    .where(
      and(
        sql`${customerReports.openaiResponseId} is not null`,
        inArray(customerReports.status, CRON_RECOVERABLE_RESEARCH_STATUSES),
      ),
    )
    .orderBy(desc(customerReports.researchStartedAt), desc(customerReports.updatedAt));
}

export async function getReportsByIds(ids: string[]): Promise<CustomerReport[]> {
  if (ids.length === 0) return [];
  const db = getDb();
  return db.select().from(customerReports).where(inArray(customerReports.id, ids));
}

export async function statusCounts(): Promise<Record<string, number>> {
  const db = getDb();
  const rows = await db
    .select({
      status: customerReports.status,
      count: sql<number>`count(*)::int`,
    })
    .from(customerReports)
    .groupBy(customerReports.status);
  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
}

export async function claimGenerationJob(
  id: string,
  kind: string,
  staleMs = JOB_STALE_MS,
): Promise<{ report: CustomerReport; recoveredStale: boolean } | { conflict: "active"; report: CustomerReport }> {
  const existing = await getReportById(id);
  if (!existing) throw new Error(`Report ${id} not found`);
  const now = new Date();
  const conflict = jobConflict(existing, now, staleMs);
  if (conflict === "active") {
    return { conflict: "active", report: existing };
  }

  const staleBefore = new Date(now.getTime() - staleMs);
  const db = getDb();
  const [updated] = await db
    .update(customerReports)
    .set({
      jobKind: kind,
      jobStartedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(customerReports.id, id),
        or(isNull(customerReports.jobStartedAt), lt(customerReports.jobStartedAt, staleBefore)),
      ),
    )
    .returning();

  if (!updated) {
    const raced = await getReportById(id);
    return { conflict: "active", report: raced ?? existing };
  }
  return { report: updated, recoveredStale: conflict === "stale" };
}

export async function releaseGenerationJob(id: string, kind: string): Promise<void> {
  const db = getDb();
  await db
    .update(customerReports)
    .set({
      jobKind: null,
      jobStartedAt: null,
      updatedAt: new Date(),
    })
    .where(and(eq(customerReports.id, id), eq(customerReports.jobKind, kind)));
}

export async function claimPaidDelivery(id: string): Promise<CustomerReport | null> {
  const db = getDb();
  const [updated] = await db
    .update(customerReports)
    .set({
      status: "PLAN_DELIVERING",
      planDeliveringAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(customerReports.id, id), eq(customerReports.status, "PURCHASED")))
    .returning();
  return updated ?? null;
}

export type { OfferMode };
