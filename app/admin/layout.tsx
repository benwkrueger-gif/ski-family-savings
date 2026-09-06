import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin | Ski Family Savings",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full bg-subtle text-text">{children}</div>;
}
