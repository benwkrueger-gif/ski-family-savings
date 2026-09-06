import type { Metadata } from "next";
import { SITE_ASSETS } from "@/reports/assets";
import sample from "@/reports/examples/ben.json";
import { parseReport } from "@/reports/schema";
import { FullReport } from "@/reports/templates/FullReport";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Savings Plan preview",
  robots: { index: false, follow: false },
};

export default function FullReportPreviewPage() {
  const data = parseReport(sample);
  return <FullReport data={data} assets={SITE_ASSETS} />;
}
