import { addPipelineLog } from "@/lib/db/settings";
import type { CustomerReport } from "@/lib/db/schema";
import {
  decideDelete,
  decideMarkSent,
  decideRestore,
  decideUnmarkSent,
} from "@/lib/pipeline/admin-queue";
import { getReportsByIds, updateReport } from "@/lib/pipeline/store";

export type QueueActionResult = {
  id: string;
  ok: boolean;
  action: string;
  reason?: string;
  firstName?: string | null;
  email?: string | null;
};

function label(report: CustomerReport): Pick<QueueActionResult, "firstName" | "email"> {
  return { firstName: report.firstName, email: report.email };
}

export async function markSelectedSent(options: {
  ids: string[];
  sentAt?: Date;
  override?: boolean;
  correct?: boolean;
  deliveryType?: string | null;
}): Promise<QueueActionResult[]> {
  const reports = await getReportsByIds(options.ids);
  const byId = new Map(reports.map((report) => [report.id, report]));
  const results: QueueActionResult[] = [];

  for (const id of options.ids) {
    const report = byId.get(id);
    if (!report) {
      results.push({ id, ok: false, action: "missing" });
      continue;
    }
    const decision = decideMarkSent(report, options);
    if (decision.action === "skip") {
      results.push({ id, ok: true, action: "skip", reason: decision.reason, ...label(report) });
      continue;
    }
    const sentAt =
      decision.action === "mark" && report.initialReportSentAt
        ? report.initialReportSentAt
        : decision.sentAt;
    await updateReport(id, {
      initialReportSentAt: sentAt,
      initialReportDeliveryType: decision.deliveryType,
    });
    await addPipelineLog(
      id,
      "INITIAL_REPORT_SENT",
      decision.action === "correct"
        ? `Manual sent date corrected to ${sentAt.toISOString()} (${decision.deliveryType})`
        : `Initial ${decision.deliveryType} report marked sent at ${sentAt.toISOString()}`,
    );
    results.push({ id, ok: true, action: decision.action, ...label(report) });
  }

  return results;
}

export async function unmarkSelectedSent(ids: string[]): Promise<QueueActionResult[]> {
  const reports = await getReportsByIds(ids);
  const byId = new Map(reports.map((report) => [report.id, report]));
  const results: QueueActionResult[] = [];

  for (const id of ids) {
    const report = byId.get(id);
    if (!report) {
      results.push({ id, ok: false, action: "missing" });
      continue;
    }
    const decision = decideUnmarkSent(report);
    if (decision.action === "skip") {
      results.push({ id, ok: true, action: "skip", reason: decision.reason, ...label(report) });
      continue;
    }
    await updateReport(id, {
      initialReportSentAt: null,
      initialReportDeliveryType: null,
    });
    await addPipelineLog(id, "INITIAL_REPORT_UNSENT", "Manual sent tracking cleared");
    results.push({ id, ok: true, action: "unmark", ...label(report) });
  }

  return results;
}

export async function deleteSelectedReports(options: {
  ids: string[];
  forceActiveJob?: boolean;
  confirmPaid?: boolean;
}): Promise<QueueActionResult[]> {
  const reports = await getReportsByIds(options.ids);
  const byId = new Map(reports.map((report) => [report.id, report]));
  const results: QueueActionResult[] = [];

  for (const id of options.ids) {
    const report = byId.get(id);
    if (!report) {
      results.push({ id, ok: false, action: "missing" });
      continue;
    }
    const decision = decideDelete(report, options);
    if (decision.action === "skip") {
      results.push({ id, ok: true, action: "skip", reason: decision.reason, ...label(report) });
      continue;
    }
    if (decision.action === "block") {
      results.push({ id, ok: false, action: "block", reason: decision.reason, ...label(report) });
      continue;
    }
    await updateReport(id, { deletedAt: new Date() });
    await addPipelineLog(id, "ARCHIVED", "Soft-deleted from the working queue");
    results.push({ id, ok: true, action: "delete", ...label(report) });
  }

  return results;
}

export async function restoreSelectedReports(ids: string[]): Promise<QueueActionResult[]> {
  const reports = await getReportsByIds(ids);
  const byId = new Map(reports.map((report) => [report.id, report]));
  const results: QueueActionResult[] = [];

  for (const id of ids) {
    const report = byId.get(id);
    if (!report) {
      results.push({ id, ok: false, action: "missing" });
      continue;
    }
    const decision = decideRestore(report);
    if (decision.action === "skip") {
      results.push({ id, ok: true, action: "skip", reason: decision.reason, ...label(report) });
      continue;
    }
    await updateReport(id, { deletedAt: null });
    await addPipelineLog(id, "RESTORED", "Restored to the working queue");
    results.push({ id, ok: true, action: "restore", ...label(report) });
  }

  return results;
}
