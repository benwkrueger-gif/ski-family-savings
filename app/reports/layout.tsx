import { notFound } from "next/navigation";
import "@/reports/styles/print.css";

export const metadata = {
  robots: { index: false, follow: false },
};

export default function ReportsLayout({ children }: LayoutProps<"/reports">) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="report-preview-body min-h-full">
      <nav className="report-dev-nav print-hidden mx-auto flex max-w-[8.5in] items-center gap-5 px-4 py-3 text-sm">
        <a href="/reports/free" className="font-display font-bold tracking-wide text-dark">
          Free Scan
        </a>
        <a href="/reports/full" className="font-display font-bold tracking-wide text-dark">
          Savings Plan
        </a>
        <span className="text-muted">Internal preview · not public</span>
      </nav>
      <div className="report-preview-frame">{children}</div>
    </div>
  );
}
