"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPending(false);
    if (!response.ok) {
      setError("That password did not work.");
      return;
    }
    router.push(search.get("next") || "/admin/submissions");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-16">
      <p className="eyebrow">Internal</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-[-0.02em] text-dark">
        Admin login
      </h1>
      <p className="mt-3 text-muted">This is just for Ben. Not a customer page.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-[4px] border border-border bg-background p-6">
        <label className="block text-sm font-semibold text-dark">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-[4px] border border-border px-3 py-2"
            autoFocus
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-[4px] bg-accent px-5 py-2.5 font-display text-sm font-bold text-dark"
        >
          {pending ? "Checking…" : "Log in"}
        </button>
      </form>
    </main>
  );
}
