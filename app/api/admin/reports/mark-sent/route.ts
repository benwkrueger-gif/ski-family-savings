import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { markSelectedSent } from "@/lib/pipeline/admin-queue-actions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as {
    ids?: string[];
    sentAt?: string;
    override?: boolean;
    correct?: boolean;
    deliveryType?: string;
  } | null;
  const ids = body?.ids ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Select at least one report" }, { status: 400 });
  }

  const sentAt = body?.sentAt ? new Date(body.sentAt) : undefined;
  if (sentAt && Number.isNaN(sentAt.getTime())) {
    return NextResponse.json({ error: "Invalid sent date" }, { status: 400 });
  }

  const results = await markSelectedSent({
    ids,
    sentAt,
    override: Boolean(body?.override),
    correct: Boolean(body?.correct),
    deliveryType: body?.deliveryType,
  });
  return NextResponse.json({ ok: true, results });
}
