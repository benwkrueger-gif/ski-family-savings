import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { JobInProgressError } from "@/lib/pipeline/artifacts";
import { generateAndUploadPdfs } from "@/lib/pipeline/complete";
import { getReportById } from "@/lib/pipeline/store";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  try {
    const report = await generateAndUploadPdfs(id);
    return NextResponse.json({
      ok: true,
      status: report.status,
      writingFingerprint: report.writingFingerprint,
      pdfsFingerprint: report.pdfsFingerprint,
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
