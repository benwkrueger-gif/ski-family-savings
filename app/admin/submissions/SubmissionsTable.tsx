"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { CustomerReport } from "@/lib/db/schema";
import { driveFolderUrl } from "@/lib/google/urls";
import { artifactStatus } from "@/lib/pipeline/artifacts";

function money(value: number | null | undefined): string {
  if (value == null) return "—";
  return `$${Math.round(value)}`;
}

function yesNo(value: unknown): string {
  return value ? "Yes" : "—";
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
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export function SubmissionsTable({ reports }: { reports: CustomerReport[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, value]) => value).map(([id]) => id),
    [selected],
  );

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => run("sync", () => postJson("/api/admin/sync-tally"))}
          className="rounded-[4px] bg-dark px-4 py-2 text-sm font-bold text-white"
        >
          {busy === "sync" ? "Syncing…" : "Sync from Tally"}
        </button>
        <button
          type="button"
          disabled={Boolean(busy) || selectedIds.length === 0}
          onClick={() => run("selected", () => postJson("/api/admin/reports/run-selected", { ids: selectedIds }))}
          className="rounded-[4px] border border-border bg-background px-4 py-2 text-sm font-bold text-dark disabled:opacity-40"
        >
          {busy === "selected" ? "Starting…" : `Run selected (${selectedIds.length})`}
        </button>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
      </div>

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
              <th className="px-3 py-3">First name</th>
              <th className="px-3 py-3">Email</th>
              <th className="px-3 py-3">ZIP</th>
              <th className="px-3 py-3">Family</th>
              <th className="px-3 py-3">Tally ID</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Savings</th>
              <th className="px-3 py-3">Confidence</th>
              <th className="px-3 py-3">Offer</th>
              <th className="px-3 py-3">Scan</th>
              <th className="px-3 py-3">Plan</th>
              <th className="px-3 py-3">Drive</th>
              <th className="px-3 py-3">Draft</th>
              <th className="px-3 py-3">Purchased</th>
              <th className="px-3 py-3">Delivered</th>
              <th className="px-3 py-3">Error</th>
              <th className="px-3 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={19} className="px-3 py-8 text-center text-muted">
                  No submissions yet. Sync from Tally or wait for a webhook.
                </td>
              </tr>
            ) : (
              reports.map((report) => {
                const artifacts = artifactStatus(report);
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
                    {artifacts.draft === "current" ? "Current" : artifacts.draft === "stale" ? "Stale" : "—"}
                  </td>
                  <td className="px-3 py-3">{yesNo(report.purchasedAt || report.stripePaymentStatus === "paid")}</td>
                  <td className="px-3 py-3">{yesNo(report.status === "PLAN_DELIVERED")}</td>
                  <td className="px-3 py-3 max-w-[160px] truncate text-red-700">{report.lastError || "—"}</td>
                  <td className="px-3 py-3">
                    <div className="flex min-w-[140px] flex-col gap-1">
                      <button
                        className="text-left underline"
                        onClick={() => run(`research-${report.id}`, () => postJson(`/api/admin/reports/${report.id}/research`))}
                      >
                        Run research
                      </button>
                      <button
                        className="text-left underline disabled:opacity-40"
                        disabled={artifacts.jobActive || Boolean(busy)}
                        onClick={() => run(`pdfs-${report.id}`, () => postJson(`/api/admin/reports/${report.id}/pdfs`))}
                      >
                        Regenerate PDFs
                      </button>
                      <button
                        className="text-left underline disabled:opacity-40"
                        disabled={artifacts.jobActive || Boolean(busy)}
                        onClick={() => run(`draft-${report.id}`, () => postJson(`/api/admin/reports/${report.id}/draft`))}
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
