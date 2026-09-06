import Link from "next/link";

export function AdminNav() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <Link href="/admin/submissions" className="font-display text-[15px] font-bold tracking-wide text-dark">
        Ski Family Savings
      </Link>
      <nav className="flex items-center gap-4 text-sm font-semibold">
        <Link href="/admin/submissions" className="text-dark">
          Submissions
        </Link>
        <Link href="/admin/google" className="text-muted hover:text-dark">
          Google
        </Link>
        <form action="/api/admin/logout" method="post">
          <button type="submit" className="text-muted hover:text-dark">
            Log out
          </button>
        </form>
      </nav>
    </header>
  );
}
