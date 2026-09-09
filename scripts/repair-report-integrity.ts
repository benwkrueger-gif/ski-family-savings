import fs from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { familySummaryLine } from "@/lib/family/profile";
import { addPipelineLog } from "@/lib/db/settings";
import { createInitialGmailDraft, generateAndUploadPdfs, persistValidatedWriting } from "@/lib/pipeline/complete";
import { writeReportCopy } from "@/lib/copy/editorial";
import { getReportById, updateReport } from "@/lib/pipeline/store";
import { summarizeDisplaySavings } from "@/lib/research/display-savings";
import { parseResearch } from "@/lib/research/schema";
import { applySavingsIntegrity, opportunityIntegrityFlags } from "@/lib/research/savings-integrity";
import { parseReportWriting } from "@/lib/copy/writing-schema";
import { researchToReportData } from "@/lib/research/to-report";
import { profileFromRawTally } from "@/lib/tally/normalize";
import { generateReportPdfBuffer } from "@/reports/generate-pdf-buffer";
import { DEFAULT_SEASON } from "@/config/compelling-savings";

loadEnvConfig(process.cwd());

const KATIE_REPORT_ID = "e2417386-17e5-4e4b-b39e-51bc4fb77737";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const reportId = readArg("report") ?? KATIE_REPORT_ID;
  const persist = hasFlag("persist");
  const generateDrafts = hasFlag("drafts");
  const rewrite = hasFlag("writing");
  const writeLocal = hasFlag("local-pdfs") || generateDrafts;

  const report = await getReportById(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  if (!report.researchJson) throw new Error("Canonical research is missing");
  if (report.initialReportSentAt && (persist || generateDrafts)) {
    throw new Error("This report is marked sent. Pass no --persist/--drafts, or confirm a sent replacement separately.");
  }

  const profile = profileFromRawTally({
    internalId: report.id,
    tallySubmissionId: report.tallySubmissionId,
    rawTallyJson: report.rawTallyJson,
  });
  const research = applySavingsIntegrity(parseResearch(report.researchJson));
  const display = summarizeDisplaySavings(research);
  const flags = research.opportunities.flatMap((opportunity) =>
    opportunityIntegrityFlags(opportunity, research).map((code) => `${opportunity.id}:${code}`),
  );

  console.log(
    JSON.stringify(
      {
        reportId: report.id,
        firstName: report.firstName,
        email: report.email,
        sent: report.initialReportSentAt != null,
        before: {
          offerMode: report.offerMode,
          coreSavingsLow: report.coreSavingsLow,
          coreSavingsHigh: report.coreSavingsHigh,
          affiliations: (report.familyProfile as { affiliations?: string[] } | null)?.affiliations ?? [],
        },
        after: {
          offerMode: display.offer.offerMode,
          firmLow: display.firmLow,
          firmHigh: display.firmHigh,
          conditionalLow: display.conditionalLow,
          conditionalHigh: display.conditionalHigh,
          headlineSavings: display.headlineSavings,
          conditionalSavings: display.conditionalSavings ?? null,
          counts: display.counts,
          affiliations: profile.affiliations,
          weekdayFlexibility: profile.weekdayFlexibility,
          alreadyKnownSavings: profile.alreadyKnownSavings,
          opportunities: display.opportunities.map((item) => ({
            id: item.opportunity.id,
            tier: item.tier,
            kind: item.kind,
            firm: item.firm,
            countedInHeadline: item.opportunity.countedInHeadline,
            low: item.opportunity.netSavingsLow,
            high: item.opportunity.netSavingsHigh,
          })),
        },
        flags,
      },
      null,
      2,
    ),
  );

  const outDir = path.join(process.cwd(), "reports/output");
  fs.mkdirSync(outDir, { recursive: true });
  const stem = `${report.firstName || "family"}-corrected`.replace(/\s+/g, "-");
  fs.writeFileSync(path.join(outDir, `${stem}-research.json`), JSON.stringify(research, null, 2));

  if (persist) {
    await updateReport(report.id, {
      familyProfile: profile,
      familySummary: familySummaryLine(profile),
      researchJson: research,
      coreSavingsLow: display.firmLow,
      coreSavingsHigh: display.firmHigh,
      optionalSavingsLow: display.conditionalLow,
      optionalSavingsHigh: display.conditionalHigh,
      offerMode: display.offer.offerMode,
      offerModeReason: display.offer.reason,
      lastError: null,
      lastErrorAt: null,
      ...(rewrite || generateDrafts
        ? {
            writingJson: null,
            writingFingerprint: null,
            writingCompletedAt: null,
            pdfsFingerprint: null,
            draftFingerprint: null,
          }
        : {}),
    });
    await addPipelineLog(
      report.id,
      report.status,
      `Applied savings-integrity repair. Firm ${display.firmLow}-${display.firmHigh}; offer ${display.offer.offerMode}.`,
    );
    console.log("persisted research, profile, and savings totals");
  }

  if (rewrite) {
    const writing = await writeReportCopy({
      research,
      offerMode: display.offer.offerMode,
    });
    await persistValidatedWriting({
      reportId: report.id,
      writing,
      openaiResponseId: report.openaiResponseId,
      offerMode: display.offer.offerMode,
      source: "generated",
    });
    console.log("rewrote editorial copy");
  }

  if (generateDrafts) {
    const pdfs = await generateAndUploadPdfs(report.id);
    const drafted = await createInitialGmailDraft(report.id);
    console.log(
      JSON.stringify(
        {
          status: drafted.status,
          offerMode: drafted.offerMode,
          gmailDraftId: drafted.gmailDraftId,
          driveScanFileId: pdfs.driveScanFileId,
          drivePlanFileId: pdfs.drivePlanFileId,
        },
        null,
        2,
      ),
    );
  }

  if (writeLocal) {
    const current = await getReportById(report.id);
    const storedWriting = current?.writingJson;
    if (storedWriting) {
      const writing = parseReportWriting(storedWriting);
      const data = researchToReportData({
        research,
        reportId: report.id,
        offerMode: display.offer.offerMode,
        writing,
        season: DEFAULT_SEASON,
      });
      const scan = await generateReportPdfBuffer({ data, type: "free" });
      const plan = await generateReportPdfBuffer({ data, type: "full" });
      fs.writeFileSync(path.join(outDir, `Savings Scan - ${report.firstName}-corrected.pdf`), scan.bytes);
      fs.writeFileSync(path.join(outDir, `Savings Plan - ${report.firstName}-corrected.pdf`), plan.bytes);
      console.log("wrote local corrected PDFs");
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
