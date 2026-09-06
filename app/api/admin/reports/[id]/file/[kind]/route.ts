import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getReportById } from "@/lib/pipeline/store";
import { downloadDriveFile } from "@/lib/google/drive";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; kind: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id, kind } = await context.params;
  if (kind !== "scan" && kind !== "plan") {
    return NextResponse.json({ error: "Unknown file kind" }, { status: 400 });
  }

  const report = await getReportById(id);
  if (!report) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const fileId = kind === "scan" ? report.driveScanFileId : report.drivePlanFileId;
  const filename = kind === "scan" ? report.scanFilename : report.planFilename;
  if (!fileId || !filename) return NextResponse.json({ error: "File not generated yet" }, { status: 404 });

  const bytes = await downloadDriveFile(fileId);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
