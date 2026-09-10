import fs from "fs";
import path from "path";
import { parseResearch } from "../../lib/research/schema";
import { summarizeDisplaySavings } from "../../lib/research/display-savings";
import { writeReportCopy } from "../../lib/copy/editorial";
import type { ReportWriting } from "../../lib/copy/writing-schema";
import { researchToReportData } from "../../lib/research/to-report";
import { DEFAULT_SEASON } from "../../config/compelling-savings";
import { compileReportCss, generateReport, PROJECT_ROOT, readArg } from "./render-report";
import { assertDraftCopySafe, buildInitialDraftEmail } from "../../lib/copy/emails";
import { familyMountains, highlightOpportunities } from "../../lib/copy/reports";

async function main() {
  const researchPath = readArg("research");
  if (!researchPath) throw new Error("Missing --research");
  const writingPath = readArg("writing");
  const absolute = path.isAbsolute(researchPath) ? researchPath : path.join(PROJECT_ROOT, researchPath);
  const research = parseResearch(JSON.parse(fs.readFileSync(absolute, "utf8")));
  const display = summarizeDisplaySavings(research);

  let writing: ReportWriting;
  if (writingPath) {
    const resolved = path.isAbsolute(writingPath) ? writingPath : path.join(PROJECT_ROOT, writingPath);
    writing = JSON.parse(fs.readFileSync(resolved, "utf8")) as ReportWriting;
  } else {
    const outWriting = path.join(PROJECT_ROOT, "reports/data", `${research.family.firstName.toLowerCase()}-writing.json`);
    try {
      writing = await writeReportCopy({ research, offerMode: display.offer.offerMode });
    } catch (error) {
      const failed = (error as Error & { writing?: ReportWriting }).writing;
      if (failed) {
        fs.mkdirSync(path.dirname(outWriting), { recursive: true });
        fs.writeFileSync(outWriting, JSON.stringify(failed, null, 2));
        console.error("wrote failed writing to", path.relative(PROJECT_ROOT, outWriting));
      }
      throw error;
    }
    fs.mkdirSync(path.dirname(outWriting), { recursive: true });
    fs.writeFileSync(outWriting, JSON.stringify(writing, null, 2));
    console.log("wrote", path.relative(PROJECT_ROOT, outWriting));
  }

  const data = researchToReportData({
    research,
    reportId: "local-preview",
    offerMode: display.offer.offerMode,
    writing,
    season: DEFAULT_SEASON,
    generatedDate: new Date().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  });

  const css = compileReportCss({ quiet: true });
  const scan = await generateReport({ data, type: "free", css, quietCss: true });
  const plan = await generateReport({ data, type: "full", css, quietCss: true });
  const email = buildInitialDraftEmail({
    firstName: research.family.firstName,
    offerMode: display.offer.offerMode,
    savingsRange: display.firmLow > 0 ? display.headlineSavings : "",
    checkoutUrl: display.offer.offerMode === "SCAN_UPSELL" ? "https://buy.stripe.com/test_preview" : null,
    coreSavingsLow: display.firmLow,
    mountains: familyMountains(research),
    findings: writing.scan.findings.map((finding) => finding.heading),
    programs: highlightOpportunities(display)
      .filter((item) => item.firm)
      .map((item) => item.opportunity.name),
    extras: highlightOpportunities(display)
      .filter((item) => !item.firm)
      .map((item) => item.opportunity.name),
  });
  const emailIssues = assertDraftCopySafe({
    offerMode: display.offer.offerMode,
    body: email.body,
    html: email.html,
    checkoutUrl: display.offer.offerMode === "SCAN_UPSELL" ? "https://buy.stripe.com/test_preview" : null,
  });
  if (emailIssues.length > 0) {
    throw new Error(`Preview email failed copy checks: ${emailIssues.join("; ")}`);
  }
  console.log(
    JSON.stringify(
      {
        offerMode: display.offer.offerMode,
        firmLow: display.firmLow,
        conditionalSavings: display.conditionalSavings,
        counts: display.counts,
        scan: path.relative(PROJECT_ROOT, scan.pdfPath),
        plan: path.relative(PROJECT_ROOT, plan.pdfPath),
        emailSubject: email.subject,
        emailBody: email.body,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
