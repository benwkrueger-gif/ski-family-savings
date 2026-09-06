import type { Metadata } from "next";
import { SITE_ASSETS } from "@/reports/assets";
import sample from "@/reports/examples/ben.json";
import { parseReport } from "@/reports/schema";
import { FreeScanReport } from "@/reports/templates/FreeScanReport";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Scan preview",
  robots: { index: false, follow: false },
};

export default function FreeScanPreviewPage() {
  const data = parseReport(sample);
  return <FreeScanReport data={data} assets={SITE_ASSETS} />;
}
