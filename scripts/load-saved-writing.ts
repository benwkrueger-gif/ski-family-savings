import fs from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { adaptWritingForOfferMode, editorialQualityIssues, reuseSavedWriting } from "@/lib/copy/editorial";
import { parseReportWriting } from "@/lib/copy/writing-schema";
import { persistValidatedWriting } from "@/lib/pipeline/complete";
import { getReportById } from "@/lib/pipeline/store";
import { parseResearch } from "@/lib/research/schema";
import { summarizeDisplaySavings } from "@/lib/research/display-savings";

loadEnvConfig(process.cwd());

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const reportId = readArg("report");
  const file = readArg("file");
  if (!reportId || !file) {
    throw new Error("Usage: tsx scripts/load-saved-writing.ts --report <id> --file <writing.json> [--pdfs] [--draft]");
  }

  const report = await getReportById(reportId);
  if (!report) throw new Error(`Report ${reportId} not found`);
  if (!report.researchJson) throw new Error("Canonical research is missing; will not load writing");

  const research = parseResearch(report.researchJson);
  const offerMode = (report.offerMode ?? summarizeDisplaySavings(research).offer.offerMode) as
    | "SCAN_UPSELL"
    | "FULL_PLAN_FREE";
  const absolute = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
  const stored = parseReportWriting(JSON.parse(fs.readFileSync(absolute, "utf8")));
  const adapted = adaptWritingForOfferMode(stored, offerMode);
  const reused = reuseSavedWriting({ stored, research, offerMode });
  if (!reused) {
    const issues = editorialQualityIssues({ writing: adapted, research, offerMode });
    throw new Error(`Saved writing is not compatible with current research: ${issues.join("; ")}`);
  }

  const updated = await persistValidatedWriting({
    reportId,
    writing: reused,
    openaiResponseId: report.openaiResponseId,
    offerMode,
    source: "saved",
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        reportId,
        status: updated.status,
        offerMode,
        writingFingerprint: updated.writingFingerprint,
        reused: true,
      },
      null,
      2,
    ),
  );

  if (hasFlag("pdfs") || hasFlag("draft")) {
    const { generateAndUploadPdfs, createInitialGmailDraft } = await import("@/lib/pipeline/complete");
    if (hasFlag("pdfs")) {
      const pdfs = await generateAndUploadPdfs(reportId, reused);
      console.log(JSON.stringify({ pdfs: pdfs.status, pdfsFingerprint: pdfs.pdfsFingerprint }, null, 2));
    }
    if (hasFlag("draft")) {
      const draft = await createInitialGmailDraft(reportId, reused);
      console.log(
        JSON.stringify(
          { draft: draft.status, draftId: draft.gmailDraftId, draftFingerprint: draft.draftFingerprint },
          null,
          2,
        ),
      );
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
