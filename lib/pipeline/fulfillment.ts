import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { stripeFulfillments } from "@/lib/db/schema";
import { addPipelineLog } from "@/lib/db/settings";
import { downloadDriveFile } from "@/lib/google/drive";
import { sendGmailMessage } from "@/lib/google/gmail";
import { assertSameCustomer, emailsMatch } from "@/lib/identity";
import { log } from "@/lib/logger";
import { parseResearch } from "@/lib/research/schema";
import { parseReportWriting } from "@/lib/copy/writing-schema";
import { buildPaidPlanEmail, safePaidRecommendation } from "@/lib/copy/emails";
import type { CustomerReport } from "@/lib/db/schema";
import { getReportById, markError, updateReport } from "./store";
import { sessionLooksPaid, type StripeSessionLike } from "@/lib/stripe/session";

export type { StripeSessionLike };
export { sessionLooksPaid };

export async function alreadyFulfilledSession(sessionId: string): Promise<boolean> {
  const db = getDb();
  const rows = await db
    .select()
    .from(stripeFulfillments)
    .where(eq(stripeFulfillments.stripeSessionId, sessionId))
    .limit(1);
  return rows[0]?.status === "delivered";
}

export async function fulfillPaidPlan(options: {
  stripeEventId: string;
  session: StripeSessionLike;
}): Promise<{ delivered: boolean; reason: string; reportId?: string }> {
  const session = options.session;
  if (!sessionLooksPaid(session)) {
    return { delivered: false, reason: `session ${session.id} is not paid` };
  }

  if (await alreadyFulfilledSession(session.id)) {
    log.info("paid_report_already_sent", { stripeSessionId: session.id });
    return { delivered: false, reason: "already fulfilled" };
  }

  const reportId = session.client_reference_id?.trim();
  if (!reportId) {
    await recordFulfillment({
      stripeEventId: options.stripeEventId,
      stripeSessionId: session.id,
      reportId: "00000000-0000-0000-0000-000000000000",
      status: "failed",
      mismatch: "missing client_reference_id",
    });
    log.error("fulfillment_mismatch", { stripeSessionId: session.id, mismatch: "missing client_reference_id" });
    return { delivered: false, reason: "missing client_reference_id" };
  }

  const report = await getReportById(reportId);
  if (!report) {
    await recordFulfillment({
      stripeEventId: options.stripeEventId,
      stripeSessionId: session.id,
      reportId,
      status: "failed",
      mismatch: `no report for client_reference_id ${reportId}`,
    });
    log.error("fulfillment_mismatch", { stripeSessionId: session.id, reportId, mismatch: "report not found" });
    return { delivered: false, reason: "report not found" };
  }

  const stripeEmail = session.customer_details?.email || session.customer_email;
  const identity = assertSameCustomer({
    internalId: report.id,
    email: report.email,
    planReportId: report.id,
    planCustomerEmail: report.email,
    stripeClientReferenceId: session.client_reference_id,
  });

  const emailMismatch = stripeEmail && report.email && !emailsMatch(stripeEmail, report.email);
  if (!identity.ok || emailMismatch || !report.drivePlanFileId || !report.planFilename || !report.email) {
    const mismatch = [
      ...identity.mismatches,
      emailMismatch ? `stripe email ${stripeEmail} does not match report email ${report.email}` : null,
      !report.drivePlanFileId ? "Savings Plan PDF is missing" : null,
      report.drivePlanFileId && report.id !== reportId ? "plan does not belong to this report" : null,
      !report.email ? "report email is missing" : null,
    ]
      .filter(Boolean)
      .join("; ");

    await updateReport(report.id, {
      status: "PLAN_DELIVERY_FAILED",
      stripeCheckoutSessionId: session.id,
      stripePaymentStatus: session.payment_status ?? "paid",
      lastError: mismatch,
      lastErrorAt: new Date(),
    });
    await recordFulfillment({
      stripeEventId: options.stripeEventId,
      stripeSessionId: session.id,
      reportId: report.id,
      status: "failed",
      mismatch,
    });
    log.error("fulfillment_mismatch", { reportId: report.id, stripeSessionId: session.id, mismatch });
    return { delivered: false, reason: mismatch, reportId: report.id };
  }

  if (report.gmailPaidMessageId || report.status === "PLAN_DELIVERED") {
    log.info("paid_report_already_sent", { reportId: report.id, stripeSessionId: session.id });
    return { delivered: false, reason: "already delivered", reportId: report.id };
  }

  await updateReport(report.id, {
    status: "PLAN_DELIVERING",
    stripeCheckoutSessionId: session.id,
    stripePaymentStatus: session.payment_status ?? "paid",
    stripePaidAt: new Date(),
    purchasedAt: report.purchasedAt ?? new Date(),
    planDeliveringAt: new Date(),
  });

  try {
    const bytes = await downloadDriveFile(report.drivePlanFileId);
    const email = buildPaidPlanEmail({
      firstName: report.firstName || "there",
      startHereRecommendation: paidStartHereRecommendation(report),
    });
    if (/buy\.stripe|checkout|Get the full Savings Plan for \$49/i.test(`${email.body}\n${email.html}`)) {
      throw new Error("Paid delivery email includes a purchase CTA");
    }
    const messageId = await sendGmailMessage({
      to: report.email,
      subject: email.subject,
      body: email.body,
      html: email.html,
      attachments: [{ filename: report.planFilename, contentType: "application/pdf", bytes }],
    });

    await updateReport(report.id, {
      status: "PLAN_DELIVERED",
      gmailPaidMessageId: messageId,
      planDeliveredAt: new Date(),
      lastError: null,
    });
    await recordFulfillment({
      stripeEventId: options.stripeEventId,
      stripeSessionId: session.id,
      reportId: report.id,
      status: "delivered",
    });
    await addPipelineLog(report.id, "PLAN_DELIVERED", `Paid Savings Plan emailed (${messageId})`);
    log.info("paid_report_sent", { reportId: report.id, stripeSessionId: session.id, gmailMessageId: messageId });
    return { delivered: true, reason: "sent", reportId: report.id };
  } catch (error) {
    await markError(report.id, "PLAN_DELIVERY_FAILED", error);
    await recordFulfillment({
      stripeEventId: options.stripeEventId,
      stripeSessionId: session.id,
      reportId: report.id,
      status: "failed",
      mismatch: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function retryPaidDelivery(reportId: string): Promise<CustomerReport> {
  const report = await getReportById(reportId);
  if (!report) throw new Error("Report not found");
  if (report.gmailPaidMessageId) return report;
  const result = await fulfillPaidPlan({
    stripeEventId: `retry-${reportId}-${Date.now()}`,
    session: {
      id: report.stripeCheckoutSessionId || `retry-${reportId}`,
      payment_status: "paid",
      client_reference_id: report.id,
      customer_email: report.email,
    },
  });
  if (!result.delivered && result.reason !== "already fulfilled" && result.reason !== "already delivered") {
    throw new Error(result.reason);
  }
  const updated = await getReportById(reportId);
  if (!updated) throw new Error("Report not found");
  return updated;
}

function paidStartHereRecommendation(report: CustomerReport): string | undefined {
  try {
    if (report.writingJson) {
      const writing = parseReportWriting(report.writingJson);
      const fromWriting = safePaidRecommendation(writing.plan.startHere[0]?.title);
      if (fromWriting) return fromWriting;
    }
  } catch {
    // Fall through to research facts rather than inventing a recommendation.
  }
  try {
    if (report.researchJson) {
      const research = parseResearch(report.researchJson);
      return safePaidRecommendation(research.paidPlan.startHere[0]?.title);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function recordFulfillment(options: {
  stripeEventId: string;
  stripeSessionId: string;
  reportId: string;
  status: string;
  mismatch?: string;
}) {
  const db = getDb();
  try {
    await db.insert(stripeFulfillments).values({
      id: randomUUID(),
      stripeEventId: options.stripeEventId,
      stripeSessionId: options.stripeSessionId,
      reportId: options.reportId,
      status: options.status,
      mismatch: options.mismatch,
    });
  } catch {
    await db
      .update(stripeFulfillments)
      .set({
        status: options.status,
        mismatch: options.mismatch,
        updatedAt: new Date(),
      })
      .where(eq(stripeFulfillments.stripeSessionId, options.stripeSessionId));
  }
}
