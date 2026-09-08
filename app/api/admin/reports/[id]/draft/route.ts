import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { JobInProgressError } from "@/lib/pipeline/artifacts";
import { createInitialGmailDraft } from "@/lib/pipeline/complete";
import { getReportById } from "@/lib/pipeline/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  try {
    const report = await createInitialGmailDraft(id);
    return NextResponse.json({
      ok: true,
      status: report.status,
      draftFingerprint: report.draftFingerprint,
    });
  } catch (error) {
    if (error instanceof JobInProgressError) {
      const report = await getReportById(id);
      return NextResponse.json(
        {
          ok: true,
          action: "in_progress",
          message: error.message,
          status: report?.status,
          jobKind: report?.jobKind,
          jobStartedAt: report?.jobStartedAt,
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
