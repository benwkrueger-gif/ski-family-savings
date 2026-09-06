"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CustomerReport } from "@/lib/db/schema";

async function post(url: string) {
  const response = await fetch(url, { method: "POST" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed");
}

export function SubmissionActions({ report }: { report: CustomerReport }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(label: string, url: string) {
    setBusy(label);
    setError(null);
    try {
      await post(url);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const actions = [
    { id: "research", label: "Run / retry research", url: `/api/admin/reports/${report.id}/research` },
    { id: "pdfs", label: "Regenerate PDFs", url: `/api/admin/reports/${report.id}/pdfs` },
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
          disabled={Boolean(busy)}
          onClick={() => run(action.id, action.url)}
          className="rounded-[4px] border border-border bg-background px-3 py-2 text-sm font-semibold text-dark"
        >
          {busy === action.id ? "Working…" : action.label}
        </button>
      ))}
      {error ? <p className="w-full text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
