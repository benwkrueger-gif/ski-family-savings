import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { recalculateOfferMode } from "@/lib/pipeline/complete";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  try {
    const report = await recalculateOfferMode(id);
    return NextResponse.json({ ok: true, offerMode: report.offerMode, reason: report.offerModeReason });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
