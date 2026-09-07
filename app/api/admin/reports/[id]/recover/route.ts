import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { recoverExistingResearch } from "@/lib/pipeline/recover";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const result = await recoverExistingResearch(id);
  const status =
    result.action === "error"
      ? 500
      : result.action === "missing_response"
        ? 400
        : 200;
  return NextResponse.json(result, { status });
}
