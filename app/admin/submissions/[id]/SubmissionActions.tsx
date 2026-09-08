"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerReport } from "@/lib/db/schema";
import type { ArtifactStatus } from "@/lib/pipeline/artifacts";

async function post(url: string) {
  const response = await fetch(url, { method: "POST" });
  const data = await response.json().catch(() => ({}));
  if (response.status === 409 && data.action === "in_progress") {
    return data as { ok?: boolean; message?: string; action?: string };
  }
  if (!response.ok) throw new Error(data.message || data.error || "Request failed");
  return data as { ok?: boolean; message?: string; action?: string };
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

  async function run(label: string, url: string) {
    setBusy(label);
    setError(null);
    setInfo(null);
    try {
      const data = await post(url);
      if (data.action === "in_progress") {
        setInfo(data.message || "A job is already running for this report.");
      } else if (data.ok === false) {
        setError(data.message || "Request failed");
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

  const jobActive = artifacts.jobActive || Boolean(busy);
  const actions = [
    { id: "recover", label: "Check / Recover Research", url: `/api/admin/reports/${report.id}/recover` },
    { id: "research", label: "Run / retry research", url: `/api/admin/reports/${report.id}/research` },
    {
      id: "pdfs",
      label: artifacts.writing === "current" ? "Regenerate PDFs" : "Write copy and regenerate PDFs",
      url: `/api/admin/reports/${report.id}/pdfs`,
    },
    { id: "offer", label: "Recalculate offer mode", url: `/api/admin/reports/${report.id}/offer-mode` },
    { id: "draft", label: "Recreate Gmail draft", url: `/api/admin/reports/${report.id}/draft` },
    { id: "deliver", label: "Retry paid delivery", url: `/api/admin/reports/${report.id}/deliver` },
  ];

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={jobActive}
          onClick={() => run(action.id, action.url)}
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
