import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createInitialGmailDraft } from "@/lib/pipeline/complete";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  try {
    await createInitialGmailDraft(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
