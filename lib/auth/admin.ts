import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export const ADMIN_COOKIE = "sfs_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = {
  v: 1;
  exp: number;
};

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createAdminSessionToken(now = Date.now()): string {
  const payload: SessionPayload = { v: 1, exp: now + MAX_AGE_SECONDS * 1000 };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, env.adminSessionSecret())}`;
}

export function verifyAdminSessionToken(token: string | undefined | null, now = Date.now()): boolean {
  if (!token) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  let secret: string;
  try {
    secret = env.adminSessionSecret();
  } catch {
    return false;
  }
  const expected = sign(encoded, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SessionPayload;
    return payload.v === 1 && typeof payload.exp === "number" && payload.exp > now;
  } catch {
    return false;
  }
}

export async function isAdminRequest(cookieHeader?: string | null): Promise<boolean> {
  if (cookieHeader) {
    const match = cookieHeader.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
    return verifyAdminSessionToken(match?.[1]);
  }
  const store = await cookies();
  return verifyAdminSessionToken(store.get(ADMIN_COOKIE)?.value);
}

export function adminCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SECONDS}${secure}`;
}

export function clearAdminCookieHeader(): string {
  return `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function passwordsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
