import { COMPELLING_SAVINGS_MIN } from "@/config/compelling-savings";
import { listReports } from "@/lib/pipeline/store";
import { AdminNav } from "@/app/admin/AdminNav";
import { SubmissionsTable } from "@/app/admin/submissions/SubmissionsTable";
import {
  ERROR_STATUSES,
  GENERATING_STATUSES,
  RESEARCHING_STATUSES,
  isQueuedForAutoResearch,
} from "@/lib/pipeline/status";
import { artifactStatus } from "@/lib/pipeline/artifacts";
import {
  isDeleted,
  isInternalTest,
  isSentInQueue,
  matchesQueueView,
  parseQueueView,
  type QueueView,
} from "@/lib/pipeline/admin-queue";
import Link from "next/link";

export const dynamic = "force-dynamic";

const VIEWS: Array<{ id: QueueView; label: string }> = [
  { id: "todo", label: "To do" },
  { id: "sent", label: "Sent" },
  { id: "all", label: "All" },
  { id: "deleted", label: "Deleted" },
];

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const params = await searchParams;
  const view = parseQueueView(params.view);
  const reports = await listReports();
  const counted = reports.filter((row) => !isDeleted(row) && !isInternalTest(row));
  const todo = counted.filter((row) => !isSentInQueue(row));
  const sent = counted.filter((row) => isSentInQueue(row));
  const visible = reports.filter((row) => matchesQueueView(row, view));
  const summary = {
    "To do": todo.length,
    Sent: sent.length,
    Queued: todo.filter((row) => isQueuedForAutoResearch(row)).length,
    Researching: todo.filter((row) => RESEARCHING_STATUSES.includes(row.status as never)).length,
    Generating: todo.filter((row) => GENERATING_STATUSES.includes(row.status as never)).length,
    "Ready for review": todo.filter((row) => artifactStatus(row).deliveryReady).length,
    Errors: todo.filter((row) => ERROR_STATUSES.includes(row.status as never)).length,
    Purchased: counted.filter((row) => Boolean(row.purchasedAt) || row.status === "PURCHASED").length,
  };

  return (
    <main className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
      <AdminNav />
      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.02em] text-dark">
            Submissions
          </h1>
          <p className="mt-2 text-sm text-muted">
            Compelling savings threshold: ${COMPELLING_SAVINGS_MIN}. New Tally submissions research
            automatically. Historical imports stay idle until you select them and click Run research.
            Drafts are never sent until you send them from Gmail.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {Object.entries(summary).map(([label, value]) => (
          <div key={label} className="rounded-[4px] border border-border bg-background px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold text-dark">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        {VIEWS.map((item) => {
          const href = item.id === "todo" ? "/admin/submissions" : `/admin/submissions?view=${item.id}`;
          const active = view === item.id;
          return (
            <Link
              key={item.id}
              href={href}
              className={`rounded-[4px] px-3 py-2 text-sm font-bold ${
                active ? "bg-dark text-white" : "border border-border bg-background text-dark"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <SubmissionsTable reports={visible} view={view} />
    </main>
  );
}
