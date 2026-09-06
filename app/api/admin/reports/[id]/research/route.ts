import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { startResearch } from "@/lib/pipeline/research";
import { log } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { id } = await context.params;
  try {
    await startResearch(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("admin_research_failed", {
      reportId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
