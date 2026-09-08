import { COMPELLING_SAVINGS_MIN } from "@/config/compelling-savings";
import { listReports } from "@/lib/pipeline/store";
import { AdminNav } from "@/app/admin/AdminNav";
import { SubmissionsTable } from "@/app/admin/submissions/SubmissionsTable";
import { ERROR_STATUSES, RESEARCHING_STATUSES } from "@/lib/pipeline/status";
import { artifactStatus } from "@/lib/pipeline/artifacts";

export const dynamic = "force-dynamic";

export default async function SubmissionsPage() {
  const reports = await listReports();
  const counted = reports.filter((row) => row.source !== "internal-test");
  const summary = {
    New: counted.filter((row) => row.status === "RECEIVED").length,
    Researching: counted.filter((row) => RESEARCHING_STATUSES.includes(row.status as never)).length,
    "Ready for review": counted.filter((row) => artifactStatus(row).deliveryReady).length,
    "Scan + upsell": counted.filter((row) => row.offerMode === "SCAN_UPSELL").length,
    "Full plan free": counted.filter((row) => row.offerMode === "FULL_PLAN_FREE").length,
    Purchased: counted.filter((row) => Boolean(row.purchasedAt) || row.status === "PURCHASED").length,
    Delivered: counted.filter((row) => row.status === "PLAN_DELIVERED").length,
    Errors: counted.filter((row) => ERROR_STATUSES.includes(row.status as never)).length,
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
            Compelling savings threshold: ${COMPELLING_SAVINGS_MIN}. Historical imports do not auto-research.
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

      <SubmissionsTable reports={reports} />
    </main>
  );
}
