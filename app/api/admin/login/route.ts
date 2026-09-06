import { NextResponse } from "next/server";
import { createAdminSessionToken, adminCookieHeader, passwordsMatch } from "@/lib/auth/admin";
import { env } from "@/lib/env";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { password?: string } | null;
  const password = body?.password ?? "";
  let expected: string;
  try {
    expected = env.adminPassword();
  } catch {
    return NextResponse.json({ error: "Admin auth is not configured" }, { status: 500 });
  }

  if (!passwordsMatch(password, expected)) {
    log.warn("admin_login_failed");
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const token = createAdminSessionToken();
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", adminCookieHeader(token));
  return response;
}
