import { NextResponse } from "next/server";
import { log } from "@/lib/logger";
import { recoverStuckResearchJobs } from "@/lib/pipeline/recover";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");
  if (secret) return auth === `Bearer ${secret}`;
  return request.headers.get("x-vercel-cron") === "1";
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await recoverStuckResearchJobs();
  log.info("cron_recover_research", {
    count: results.length,
    ingested: results.filter((result) => result.action === "ingested").length,
    inProgress: results.filter((result) => result.action === "in_progress").length,
    failed: results.filter((result) => !result.ok).length,
  });
  return NextResponse.json({
    ok: true,
    count: results.length,
    results: results.map((result) => ({
      action: result.action,
      openaiStatus: result.openaiStatus,
      reportStatus: result.reportStatus,
      message: result.message,
    })),
  });
}
