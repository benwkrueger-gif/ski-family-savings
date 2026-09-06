import { google } from "googleapis";
import { env } from "@/lib/env";
import { appUrl } from "@/lib/env";
import { getSetting, setSetting } from "@/lib/db/settings";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
];

const REFRESH_TOKEN_SETTING = "google_refresh_token";
const ROOT_FOLDER_SETTING = "google_reports_root_folder_id";

export function googleRedirectUri(): string {
  return `${appUrl().replace(/\/$/, "")}/api/admin/google/callback`;
}

export function googleOAuthClient() {
  return new google.auth.OAuth2(env.googleClientId(), env.googleClientSecret(), googleRedirectUri());
}

export function googleAuthUrl(state: string): string {
  const client = googleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

export async function storeGoogleRefreshToken(token: string): Promise<void> {
  await setSetting(REFRESH_TOKEN_SETTING, token);
}

export async function loadGoogleRefreshToken(): Promise<string> {
  const fromEnv = env.googleRefreshToken();
  if (fromEnv) return fromEnv;
  const stored = await getSetting(REFRESH_TOKEN_SETTING);
  if (!stored) {
    throw new Error("Google is not connected. Open /admin/google and complete OAuth as ben@skifamilysavings.com.");
  }
  return stored;
}

export async function getGoogleAuth() {
  const client = googleOAuthClient();
  client.setCredentials({ refresh_token: await loadGoogleRefreshToken() });
  return client;
}

export async function storeRootFolderId(id: string): Promise<void> {
  await setSetting(ROOT_FOLDER_SETTING, id);
}

export async function loadRootFolderId(): Promise<string | undefined> {
  return env.googleReportsRootFolderId() || (await getSetting(ROOT_FOLDER_SETTING));
}
