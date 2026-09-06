import { NextResponse } from "next/server";
import { clearAdminCookieHeader } from "@/lib/auth/admin";
import { appUrl } from "@/lib/env";

export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/admin/login", request.url || appUrl()), 303);
  response.headers.set("Set-Cookie", clearAdminCookieHeader());
  return response;
}
