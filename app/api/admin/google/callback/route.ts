import { NextResponse } from "next/server";
import { google } from "googleapis";
import { requireAdmin } from "@/lib/auth/require-admin";
import { googleOAuthClient, storeGoogleRefreshToken } from "@/lib/google/auth";
import { googleSenderEmail, appUrl } from "@/lib/env";
import { ensureReportsRootFolder } from "@/lib/google/drive";
import { log } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(`${appUrl()}/admin/google?error=${encodeURIComponent(error)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${appUrl()}/admin/google?error=missing_code`);
  }

  try {
    const client = googleOAuthClient();
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(
        `${appUrl()}/admin/google?error=${encodeURIComponent("No refresh token returned. Reconnect with prompt=consent.")}`,
      );
    }
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const me = await oauth2.userinfo.get();
    const email = me.data.email?.toLowerCase();
    const expected = googleSenderEmail().toLowerCase();
    if (email && email !== expected) {
      return NextResponse.redirect(
        `${appUrl()}/admin/google?error=${encodeURIComponent(`Connected as ${email}, expected ${expected}`)}`,
      );
    }
    await storeGoogleRefreshToken(tokens.refresh_token);
    await ensureReportsRootFolder();
    log.info("google_oauth_connected", { email: email || expected });
    return NextResponse.redirect(`${appUrl()}/admin/google?connected=1`);
  } catch (error) {
    log.error("google_oauth_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.redirect(
      `${appUrl()}/admin/google?error=${encodeURIComponent(error instanceof Error ? error.message : "oauth_failed")}`,
    );
  }
}
