import { AdminNav } from "@/app/admin/AdminNav";
import { googleSenderEmail } from "@/lib/env";
import { loadGoogleRefreshToken, loadRootFolderId } from "@/lib/google/auth";

export const dynamic = "force-dynamic";

export default async function GoogleConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  let connected = false;
  try {
    await loadGoogleRefreshToken();
    connected = true;
  } catch {
    connected = false;
  }
  const rootId = await loadRootFolderId().catch(() => undefined);

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 sm:px-8">
      <AdminNav />
      <p className="eyebrow mt-8">Google Workspace</p>
      <h1 className="mt-2 font-display text-4xl font-bold tracking-[-0.02em] text-dark">
        Connect Drive and Gmail
      </h1>
      <p className="mt-3 text-muted">
        Sign in once as {googleSenderEmail()}. This stores a refresh token so drafts and paid emails can
        go out from that account without you clicking through OAuth every time.
      </p>
      {params.connected ? (
        <p className="mt-4 rounded-[4px] bg-accent/40 px-3 py-2 text-sm">Connected.</p>
      ) : null}
      {params.error ? (
        <p className="mt-4 rounded-[4px] bg-red-50 px-3 py-2 text-sm text-red-700">{params.error}</p>
      ) : null}
      <ul className="mt-6 space-y-2 text-sm">
        <li>Refresh token: {connected ? "present" : "missing"}</li>
        <li>Reports root folder: {rootId || "will be created on first connect"}</li>
      </ul>
      <a
        href="/api/admin/google/start"
        className="mt-8 inline-flex rounded-[4px] bg-accent px-5 py-3 font-display text-sm font-bold text-dark"
      >
        {connected ? "Reconnect Google" : "Connect Google"}
      </a>
    </main>
  );
}
