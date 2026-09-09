import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { restoreSelectedReports } from "@/lib/pipeline/admin-queue-actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = body?.ids ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Select at least one report" }, { status: 400 });
  }

  const results = await restoreSelectedReports(ids);
  return NextResponse.json({ ok: true, results });
}
