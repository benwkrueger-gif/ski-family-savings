import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { retryPaidDelivery } from "@/lib/pipeline/fulfillment";

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
    await retryPaidDelivery(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
