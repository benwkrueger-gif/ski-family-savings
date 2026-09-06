import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { listAllTallySubmissions } from "@/lib/tally/api";
import { ingestTallyApiSubmission } from "@/lib/pipeline/ingest";
import { configuredTallyFormId } from "@/lib/tally/payload";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const formId = configuredTallyFormId();
  const { questions, submissions } = await listAllTallySubmissions(formId);
  let created = 0;
  let updated = 0;

  for (const submission of submissions) {
    if (!submission.isCompleted && submission.isCompleted !== undefined) continue;
    const result = await ingestTallyApiSubmission({ questions, submission, formId });
    if (result.created) created += 1;
    else updated += 1;
  }

  log.info("tally_import_complete", { created, updated, total: submissions.length });
  return NextResponse.json({ ok: true, created, updated, total: submissions.length });
}
