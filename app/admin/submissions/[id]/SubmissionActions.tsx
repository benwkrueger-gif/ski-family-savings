"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerReport } from "@/lib/db/schema";
import type { ArtifactStatus } from "@/lib/pipeline/artifacts";
import { SENT_ARTIFACT_REFRESH_MESSAGE } from "@/lib/pipeline/admin-queue";

async function post(url: string, body?: { confirmReplaceSent?: boolean }) {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 409 && data.action === "in_progress") {
    return data as { ok?: boolean; message?: string; action?: string };
  }
  if (response.status === 409 && data.action === "sent_protected") {
    throw new Error(data.message || SENT_ARTIFACT_REFRESH_MESSAGE);
  }
  if (!response.ok) throw new Error(data.message || data.error || "Request failed");
  return data as { ok?: boolean; message?: string; action?: string; started?: boolean; reason?: string };
}

export function SubmissionActions({
  report,
  artifacts,
}: {
  report: CustomerReport;
  artifacts: ArtifactStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const markedSent = report.initialReportSentAt != null;

  async function run(
    label: string,
    url: string,
    options?: { confirmReplaceSent?: boolean },
  ) {
    setBusy(label);
    setError(null);
    setInfo(null);
    try {
      const data = await post(url, options);
      if (data.action === "in_progress") {
        setInfo(data.message || "A job is already running for this report.");
      } else if (data.ok === false) {
        setError(data.message || "Request failed");
      } else if (data.reason === "initial_report_sent") {
        setInfo("Initial report was already marked sent. Research, PDFs, and drafts were left unchanged.");
      } else if (data.message) {
        setInfo(data.message);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  function confirmSentRefresh(): boolean {
    return window.confirm(`${SENT_ARTIFACT_REFRESH_MESSAGE}\n\nContinue anyway?`);
  }

  const jobActive = artifacts.jobActive || Boolean(busy);
  const actions = [
    { id: "recover", label: "Check / Recover Research", url: `/api/admin/reports/${report.id}/recover` },
    { id: "research", label: "Run / retry research", url: `/api/admin/reports/${report.id}/research` },
    {
      id: "pdfs",
      label: artifacts.writing === "missing" ? "Write copy and regenerate PDFs" : "Regenerate PDFs",
      url: `/api/admin/reports/${report.id}/pdfs`,
      requiresSentConfirm: true,
    },
    { id: "offer", label: "Recalculate offer mode", url: `/api/admin/reports/${report.id}/offer-mode` },
    {
      id: "draft",
      label: "Recreate Gmail draft",
      url: `/api/admin/reports/${report.id}/draft`,
      requiresSentConfirm: true,
    },
    { id: "deliver", label: "Retry paid delivery", url: `/api/admin/reports/${report.id}/deliver` },
  ];

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {markedSent ? (
        <p className="w-full text-sm text-muted">
          Marked sent. Bulk recovery and backlog refresh will skip this family. Regenerating PDFs or the
          Gmail draft requires confirmation and will not send email.
        </p>
      ) : null}
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={jobActive}
          onClick={() => {
            const needsConfirm = Boolean(action.requiresSentConfirm && markedSent);
            if (needsConfirm && !confirmSentRefresh()) return;
            void run(action.id, action.url, needsConfirm ? { confirmReplaceSent: true } : undefined);
          }}
          className="rounded-[4px] border border-border bg-background px-3 py-2 text-sm font-semibold text-dark disabled:opacity-40"
        >
          {busy === action.id ? "Working…" : action.label}
        </button>
      ))}
      {jobActive && !busy ? (
        <p className="w-full text-sm text-muted">
          Buttons are disabled while a {artifacts.jobKind ?? "pipeline"} job is active.
        </p>
      ) : null}
      {info ? <p className="w-full text-sm text-muted">{info}</p> : null}
      {error ? <p className="w-full text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
