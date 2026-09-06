import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { AdminNav } from "@/app/admin/AdminNav";
import { getDb } from "@/lib/db";
import { pipelineLogs } from "@/lib/db/schema";
import { getReportById } from "@/lib/pipeline/store";
import { driveFileUrl, driveFolderUrl } from "@/lib/google/urls";
import { SubmissionActions } from "./SubmissionActions";

export const dynamic = "force-dynamic";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const report = await getReportById(id);
  if (!report) notFound();

  const db = getDb();
  const logs = await db
    .select()
    .from(pipelineLogs)
    .where(eq(pipelineLogs.reportId, id))
    .orderBy(desc(pipelineLogs.createdAt));

  const profile = report.familyProfile as Record<string, unknown> | null;
  const research = report.researchJson as Record<string, unknown> | null;
  const summary = (research?.summary as Record<string, unknown> | undefined) ?? {};
  const opportunities = (research?.opportunities as Array<Record<string, unknown>> | undefined) ?? [];

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <AdminNav />
      <p className="mt-8">
        <Link href="/admin/submissions" className="text-sm text-muted underline">
          Back to submissions
        </Link>
      </p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.02em] text-dark">
        {report.firstName || "Submission"} {report.email ? `· ${report.email}` : ""}
      </h1>
      <p className="mt-2 font-mono text-xs text-muted">{report.id}</p>
      <p className="mt-2 text-sm">
        Status <strong>{report.status}</strong>
        {report.offerMode ? ` · ${report.offerMode}` : ""}
      </p>
      {report.offerModeReason ? <p className="mt-2 text-sm text-muted">{report.offerModeReason}</p> : null}

      <SubmissionActions report={report} />

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <Card title="Files and delivery">
          <ul className="space-y-2 text-sm">
            <li>
              Scan:{" "}
              {report.driveScanFileId ? (
                <a className="underline" href={`/api/admin/reports/${report.id}/file/scan`} target="_blank">
                  preview
                </a>
              ) : (
                "not generated"
              )}
              {report.driveScanFileId ? (
                <>
                  {" "}
                  ·{" "}
                  <a className="underline" href={driveFileUrl(report.driveScanFileId)} target="_blank">
                    Drive
                  </a>
                </>
              ) : null}
            </li>
            <li>
              Plan:{" "}
              {report.drivePlanFileId ? (
                <a className="underline" href={`/api/admin/reports/${report.id}/file/plan`} target="_blank">
                  preview
                </a>
              ) : (
                "not generated"
              )}
              {report.drivePlanFileId ? (
                <>
                  {" "}
                  ·{" "}
                  <a className="underline" href={driveFileUrl(report.drivePlanFileId)} target="_blank">
                    Drive
                  </a>
                </>
              ) : null}
            </li>
            <li>
              Drive folder:{" "}
              {report.driveFolderId ? (
                <a className="underline" href={driveFolderUrl(report.driveFolderId)} target="_blank">
                  open
                </a>
              ) : (
                "—"
              )}
            </li>
            <li>Gmail draft: {report.gmailDraftId || "—"}</li>
            <li>Purchased: {report.purchasedAt ? String(report.purchasedAt) : "no"}</li>
            <li>Stripe session: {report.stripeCheckoutSessionId || "—"}</li>
            <li>Paid message: {report.gmailPaidMessageId || "—"}</li>
            <li>Checkout URL: {report.stripeCheckoutUrl || "—"}</li>
          </ul>
        </Card>
        <Card title="Savings">
          <ul className="space-y-2 text-sm">
            <li>
              Core: ${report.coreSavingsLow ?? "—"}–${report.coreSavingsHigh ?? "—"}
            </li>
            <li>
              Optional: ${report.optionalSavingsLow ?? "—"}–${report.optionalSavingsHigh ?? "—"}
            </li>
            <li>Confidence: {report.confidence || "—"}</li>
            <li>OpenAI response: {report.openaiResponseId || "—"}</li>
            <li>Tally submission: {report.tallySubmissionId}</li>
          </ul>
        </Card>
      </section>

      {Array.isArray(report.humanReviewFlags) && report.humanReviewFlags.length > 0 ? (
        <Card title="Human review flags">
          <ul className="list-disc pl-5 text-sm">
            {report.humanReviewFlags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title="Normalized family profile">
        <pre className="overflow-x-auto text-xs leading-relaxed">{JSON.stringify(profile, null, 2)}</pre>
      </Card>

      <Card title="Original Tally answers">
        <pre className="max-h-[420px] overflow-auto text-xs leading-relaxed">
          {JSON.stringify(report.rawTallyJson, null, 2)}
        </pre>
      </Card>

      <Card title="Opportunities">
        {opportunities.length === 0 ? (
          <p className="text-sm text-muted">No research stored yet.</p>
        ) : (
          <ul className="space-y-4">
            {opportunities.map((item) => (
              <li key={String(item.id)} className="border-b border-border pb-3 text-sm last:border-0">
                <p className="font-semibold text-dark">
                  {String(item.tier)} · {String(item.name)}
                </p>
                <p className="text-muted">{String(item.countReason ?? item.calculation ?? "")}</p>
                {item.sourceUrl ? (
                  <a className="underline" href={String(item.sourceUrl)} target="_blank">
                    {String(item.sourceTitle || item.sourceUrl)}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Research summary JSON">
        <pre className="max-h-[320px] overflow-auto text-xs leading-relaxed">{JSON.stringify(summary, null, 2)}</pre>
      </Card>

      <Card title="Pipeline log">
        {report.lastError ? <p className="mb-3 text-sm text-red-700">{report.lastError}</p> : null}
        <ul className="space-y-2 text-sm">
          {logs.map((entry) => (
            <li key={entry.id}>
              <span className="font-mono text-xs text-muted">
                {entry.createdAt.toISOString()} · {entry.stage}
              </span>
              <p>{entry.message}</p>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 rounded-[4px] border border-border bg-background p-5">
      <h2 className="font-display text-xl font-bold text-dark">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}
