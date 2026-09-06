import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";
import { googleAuthUrl } from "@/lib/google/auth";
import { createHmac } from "crypto";
import { env } from "@/lib/env";

export const runtime = "nodejs";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;
  const state = createHmac("sha256", env.adminSessionSecret()).update("google-oauth").digest("hex").slice(0, 24);
  return NextResponse.redirect(googleAuthUrl(state));
}
