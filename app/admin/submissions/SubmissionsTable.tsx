"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CustomerReport } from "@/lib/db/schema";
import { driveFolderUrl } from "@/lib/google/urls";
import { gmailDraftUrl } from "@/lib/google/gmail";
import { artifactStatus } from "@/lib/pipeline/artifacts";
import {
  SENT_ARTIFACT_REFRESH_MESSAGE,
  hasPaidDeliveryRecord,
  isDeliveryReady,
  isJobActive,
  type QueueView,
} from "@/lib/pipeline/admin-queue";

function money(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${Math.round(value)}`;
}

function yesNo(value: unknown): string {
  return value ? "Yes" : "—";
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function opportunityLabel(report: CustomerReport): string {
  const summary = (
    report.researchJson as
      | {
          summary?: {
            jackpotCount?: number;
            strongCount?: number;
            usefulCount?: number;
            watchCount?: number;
          };
        }
      | null
  )?.summary;
  if (!summary) return "—";
  const counted =
    (summary.jackpotCount ?? 0) + (summary.strongCount ?? 0) + (summary.usefulCount ?? 0);
  return `${counted} counted · ${summary.watchCount ?? 0} watch`;
}

function draftLabel(report: CustomerReport, draft: "current" | "missing" | "stale"): string {
  if (!report.gmailDraftId) return "—";
  if (draft === "current") return "Open draft";
  if (draft === "stale") return "Stale draft";
  return "Draft";
}

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 409 && data.action === "in_progress") {
    throw new Error(data.message || "A job is already running for this report");
  }
  if (response.status === 409 && data.action === "sent_protected") {
    throw new Error(data.message || SENT_ARTIFACT_REFRESH_MESSAGE);
  }
  if (!response.ok) throw new Error(data.error || data.message || `Request failed (${response.status})`);
  return data as { ok?: boolean; results?: Array<{ ok: boolean; action: string; reason?: string; firstName?: string; email?: string }> };
}

function summarizeResults(
  verb: string,
  results: Array<{ ok: boolean; action: string; reason?: string }> | undefined,
): string {
  const rows = results ?? [];
  const done = rows.filter((row) => row.ok && row.action !== "skip" && row.action !== "block").length;
  const skipped = rows.filter((row) => row.action === "skip").length;
  const blocked = rows.filter((row) => !row.ok);
  const parts = [`${verb} ${done}`];
  if (skipped) parts.push(`skipped ${skipped}`);
  if (blocked.length) {
    parts.push(
      `blocked ${blocked.length}${blocked[0]?.reason ? ` (${blocked[0].reason})` : ""}`,
    );
  }
  return parts.join(". ");
}

function selectedReports(reports: CustomerReport[], selectedIds: string[]): CustomerReport[] {
  const ids = new Set(selectedIds);
  return reports.filter((report) => ids.has(report.id));
}

export function SubmissionsTable({
  reports,
  view,
}: {
  reports: CustomerReport[];
  view: QueueView;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [markOpen, setMarkOpen] = useState(false);
  const [sentAtLocal, setSentAtLocal] = useState("");
  const [override, setOverride] = useState(false);
  const [correct, setCorrect] = useState(false);
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([id]) => id),
    [selected],
  );
  const selectedRows = selectedReports(reports, selectedIds);
  const notReadyCount = selectedRows.filter((row) => !isDeliveryReady(row) && !hasPaidDeliveryRecord(row)).length;
  const activeJobCount = selectedRows.filter((row) => isJobActive(row)).length;
  const paidCount = selectedRows.filter((row) => row.source !== "internal-test" && (row.purchasedAt || row.stripePaymentStatus === "paid" || hasPaidDeliveryRecord(row))).length;

  function clearSelection() {
    setSelected({});
    setMarkOpen(false);
    setOverride(false);
    setCorrect(false);
  }

  async function run(label: string, fn: () => Promise<string | void>) {
    setBusy(label);
    setError(null);
    setMessage(null);
    try {
      const result = await fn();
      if (typeof result === "string") setMessage(result);
      clearSelection();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => run("sync", async () => {
            await postJson("/api/admin/sync-tally");
            return "Tally sync finished";
          })}
          className="rounded-[4px] bg-dark px-4 py-2 text-sm font-bold text-white"
        >
          {busy === "sync" ? "Syncing…" : "Sync from Tally"}
        </button>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>

      {selectedIds.length > 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[4px] border border-border bg-background px-4 py-3">
          <p className="text-sm font-semibold text-dark">{selectedIds.length} selected</p>
          {view !== "deleted" ? (
            <>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() =>
                  run("selected", async () => {
                    const data = await postJson("/api/admin/reports/run-selected", { ids: selectedIds });
                    return summarizeResults("Started", data.results);
                  })
                }
                className="rounded-[4px] border border-border px-3 py-2 text-sm font-bold text-dark disabled:opacity-40"
              >
                {busy === "selected" ? "Starting…" : "Run selected"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => setMarkOpen((open) => !open)}
                className="rounded-[4px] border border-border px-3 py-2 text-sm font-bold text-dark disabled:opacity-40"
              >
                Mark sent
              </button>
              {view === "sent" ? (
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    if (!window.confirm(`Undo Mark sent for ${selectedIds.length} selected report(s)? This only clears manual tracking.`)) {
                      return;
                    }
                    void run("unmark", async () => {
                      const data = await postJson("/api/admin/reports/unmark-sent", { ids: selectedIds });
                      return summarizeResults("Cleared", data.results);
                    });
                  }}
                  className="rounded-[4px] border border-border px-3 py-2 text-sm font-bold text-dark disabled:opacity-40"
                >
                  {busy === "unmark" ? "Clearing…" : "Undo Mark sent"}
                </button>
              ) : null}
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => {
                  const names = selectedRows
                    .map((row) => `${row.firstName || "Unnamed"} <${row.email || "no email"}>`)
                    .join("\n");
                  const paidNote = paidCount
                    ? `\n\n${paidCount} selected record(s) have payment or paid-delivery history. Soft-delete will hide them from the queue but keep financial records.`
                    : "";
                  const jobNote = activeJobCount
                    ? `\n\n${activeJobCount} selected record(s) have an active job. Confirming will hide them without cancelling the job.`
                    : "";
                  if (
                    !window.confirm(
                      `Soft-delete ${selectedIds.length} selected report(s)?\n\n${names}${paidNote}${jobNote}`,
                    )
                  ) {
                    return;
                  }
                  void run("delete", async () => {
                    const data = await postJson("/api/admin/reports/delete-selected", {
                      ids: selectedIds,
                      confirmPaid: paidCount > 0,
                      forceActiveJob: activeJobCount > 0,
                    });
                    return summarizeResults("Deleted", data.results);
                  });
                }}
                className="rounded-[4px] border border-red-200 px-3 py-2 text-sm font-bold text-red-800 disabled:opacity-40"
              >
                {busy === "delete" ? "Deleting…" : "Delete selected"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                run("restore", async () => {
                  const data = await postJson("/api/admin/reports/restore-selected", { ids: selectedIds });
                  return summarizeResults("Restored", data.results);
                })
              }
              className="rounded-[4px] border border-border px-3 py-2 text-sm font-bold text-dark disabled:opacity-40"
            >
              {busy === "restore" ? "Restoring…" : "Restore selected"}
            </button>
          )}
          <button
            type="button"
            className="text-sm font-semibold text-muted underline"
            onClick={clearSelection}
          >
            Clear selection
          </button>
        </div>
      ) : null}

      {markOpen && selectedIds.length > 0 ? (
        <div className="mt-3 rounded-[4px] border border-border bg-background px-4 py-4">
          <p className="text-sm font-semibold text-dark">
            Mark {selectedIds.length} report(s) as sent. This does not send email.
          </p>
          {notReadyCount > 0 ? (
            <p className="mt-2 text-sm text-red-700">
              {notReadyCount} selected report(s) are not delivery-ready. Check override only if you already sent them.
            </p>
          ) : null}
          <label className="mt-3 block text-sm text-muted">
            Actual sent date/time
            <input
              type="datetime-local"
              value={sentAtLocal}
              onChange={(event) => setSentAtLocal(event.target.value)}
              className="mt-1 block rounded-[4px] border border-border px-3 py-2 text-dark"
            />
          </label>
          <p className="mt-1 text-xs text-muted">Leave blank to use now. Use this for emails you already sent.</p>
          <label className="mt-3 flex items-center gap-2 text-sm text-dark">
            <input type="checkbox" checked={override} onChange={(event) => setOverride(event.target.checked)} />
            Override unfinished reports
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm text-dark">
            <input type="checkbox" checked={correct} onChange={(event) => setCorrect(event.target.checked)} />
            Correct an existing sent date
          </label>
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => {
                if (!window.confirm(`Mark ${selectedIds.length} selected report(s) as sent?`)) return;
                void run("mark", async () => {
                  const data = await postJson("/api/admin/reports/mark-sent", {
                    ids: selectedIds,
                    sentAt: sentAtLocal ? new Date(sentAtLocal).toISOString() : undefined,
                    override,
                    correct,
                  });
                  return summarizeResults("Marked sent", data.results);
                });
              }}
              className="rounded-[4px] bg-dark px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              {busy === "mark" ? "Saving…" : "Confirm Mark sent"}
            </button>
            <button type="button" className="text-sm font-semibold text-muted underline" onClick={() => setMarkOpen(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-4 overflow-x-auto rounded-[4px] border border-border bg-background">
        <table className="min-w-[1400px] w-full text-left text-sm">
          <thead className="bg-subtle text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-3 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  onChange={(event) => {
                    const next: Record<string, boolean> = {};
                    if (event.target.checked) {
                      for (const report of reports) next[report.id] = true;
                    }
                    setSelected(next);
                  }}
                />
              </th>
              <th className="px-3 py-3">Submitted</th>
              <th className="px-3 py-3">Updated</th>
              <th className="px-3 py-3">First name</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">ZIP</th>
              <th className="px-3 py-3">Family</th>
              <th className="px-3 py-3">Tally ID</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Savings</th>
              <th className="px-3 py-3">Opps</th>
              <th className="px-3 py-3">Confidence</th>
              <th className="px-3 py-3">Offer</th>
              <th className="px-3 py-3">Scan</th>
              <th className="px-3 py-3">Plan</th>
              <th className="px-3 py-3">Drive</th>
              <th className="px-3 py-3">Draft</th>
              <th className="px-3 py-3">Purchased</th>
              <th className="px-3 py-3">Sent</th>
              <th className="px-3 py-3">Error</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={21} className="px-3 py-8 text-center text-muted">
                  {view === "todo"
                    ? "Nothing in the working queue."
                    : view === "sent"
                      ? "No sent reports yet."
                      : view === "deleted"
                        ? "No deleted reports."
                        : "No submissions yet."}
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const artifacts = artifactStatus(report);
                const sentAt = report.initialReportSentAt || report.planDeliveredAt;
                return (
                <tr key={report.id} className="border-t border-border align-top">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[report.id])}
                      onChange={(event) =>
                        setSelected((current) => ({ ...current, [report.id]: event.target.checked }))
                      }
                    />
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {report.submittedAt ? new Date(report.submittedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs text-muted">
                    {formatDate(report.updatedAt)}
                  </td>
                  <td className="px-3 py-3">
                    <Link className="font-semibold text-dark underline" href={`/admin/submissions/${report.id}`}>
                      {report.firstName || "—"}
                    </Link>
                  </td>
                  <td className="px-3 py-3">{report.email || "—"}</td>
                  <td className="px-3 py-3">{report.homeZip || "—"}</td>
                  <td className="px-3 py-3 max-w-[180px] truncate">{report.familySummary || "—"}</td>
                  <td className="px-3 py-3 font-mono text-xs">{report.tallySubmissionId}</td>
                  <td className="px-3 py-3">{report.status}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {report.coreSavingsLow != null
                      ? `${money(report.coreSavingsLow)}–${money(report.coreSavingsHigh)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs">{opportunityLabel(report)}</td>
                  <td className="px-3 py-3">{report.confidence || "—"}</td>
                  <td className="px-3 py-3">{report.offerMode || "—"}</td>
                  <td className="px-3 py-3">
                    {report.driveScanFileId ? (
                      <a className="underline" href={`/api/admin/reports/${report.id}/file/scan`} target="_blank">
                        Open
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {report.drivePlanFileId ? (
                      <a className="underline" href={`/api/admin/reports/${report.id}/file/plan`} target="_blank">
                        Open
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {report.driveFolderId ? (
                      <a className="underline" href={driveFolderUrl(report.driveFolderId)} target="_blank">
                        Folder
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {report.gmailDraftId ? (
                      <a className="underline" href={gmailDraftUrl(report.gmailDraftId)} target="_blank">
                        {draftLabel(report, artifacts.draft)}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">{yesNo(report.purchasedAt || report.stripePaymentStatus === "paid")}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {sentAt
                      ? `${hasPaidDeliveryRecord(report) && !report.initialReportSentAt ? "Paid · " : ""}${formatDate(sentAt)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-3 max-w-[160px] truncate text-red-700">{report.lastError || "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-[140px] flex-col gap-1">
                      <button
                        className="text-left underline"
                        onClick={() => run(`research-${report.id}`, async () => {
                          await postJson(`/api/admin/reports/${report.id}/research`);
                        })}
                      >
                        Run research
                      </button>
                      <button
                        className="text-left underline disabled:opacity-40"
                        disabled={artifacts.jobActive || Boolean(busy)}
                        onClick={() => {
                          const markedSent = report.initialReportSentAt != null;
                          if (markedSent && !window.confirm(`${SENT_ARTIFACT_REFRESH_MESSAGE}\n\nContinue anyway?`)) {
                            return;
                          }
                          void run(`pdfs-${report.id}`, async () => {
                            await postJson(
                              `/api/admin/reports/${report.id}/pdfs`,
                              markedSent ? { confirmReplaceSent: true } : undefined,
                            );
                          });
                        }}
                      >
                        Regenerate PDFs
                      </button>
                      <button
                        className="text-left underline disabled:opacity-40"
                        disabled={artifacts.jobActive || Boolean(busy)}
                        onClick={() => {
                          const markedSent = report.initialReportSentAt != null;
                          if (markedSent && !window.confirm(`${SENT_ARTIFACT_REFRESH_MESSAGE}\n\nContinue anyway?`)) {
                            return;
                          }
                          void run(`draft-${report.id}`, async () => {
                            await postJson(
                              `/api/admin/reports/${report.id}/draft`,
                              markedSent ? { confirmReplaceSent: true } : undefined,
                            );
                          });
                        }}
                      >
                        Recreate draft
                      </button>
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
