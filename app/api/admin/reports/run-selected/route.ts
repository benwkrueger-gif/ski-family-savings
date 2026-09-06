import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { startResearch } from "@/lib/pipeline/research";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const body = (await request.json().catch(() => null)) as { ids?: string[] } | null;
  const ids = body?.ids ?? [];
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const id of ids) {
    try {
      await startResearch(id);
      results.push({ id, ok: true });
    } catch (error) {
      results.push({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return NextResponse.json({ ok: true, results });
}
