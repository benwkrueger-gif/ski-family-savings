import fs from "fs";
import path from "path";
import { findLatestReportJson, loadReport } from "../load-report";
import { printValidationError, ReportValidationError } from "../validate-report";
import { extractPdf, renderQaPngs, runChecks, type QaCheck } from "./pdf-qa";
import { compileReportCss, generateReport, PROJECT_ROOT, readArg } from "./render-report";

function rel(filePath: string): string {
  return path.relative(PROJECT_ROOT, filePath);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function resolveDataPath(): string {
  const explicit = readArg("data");
  if (explicit) return explicit;
  if (hasFlag("latest")) return findLatestReportJson();
  throw new ReportValidationError(
    `Missing --data.\n- Example: npm run report:all -- --data reports/data/ben-family-report.json\n- Or run: npm run report:latest`,
  );
}

async function main() {
  const dataPath = resolveDataPath();
  const data = loadReport(dataPath);
  console.log("✓ Report data valid");

  const css = compileReportCss({ quiet: true });
  const free = await generateReport({ data, type: "free", css });
  console.log("✓ Free Scan generated");
  const plan = await generateReport({ data, type: "full", css });
  console.log("✓ Savings Plan generated");

  const allChecks: QaCheck[] = [];
  for (const generated of [free, plan]) {
    const type = generated === free ? "free" : "full";
    const extracted = await extractPdf(generated.pdfPath);
    const qaDir = path.join(PROJECT_ROOT, "reports/qa", type);
    const pngCount = await renderQaPngs(generated.pdfPath, qaDir);
    allChecks.push(...runChecks(type, generated.data, extracted, pngCount));
  }

  const failed = allChecks.filter((check) => !check.ok);
  const linkChecks = allChecks.filter((check) => check.kind === "link");
  const linksOk = linkChecks.every((check) => check.ok);

  if (failed.length > 0) {
    console.error("\nQA failed:");
    for (const check of failed) {
      console.error(`FAIL  ${check.message}`);
    }
    process.exit(1);
  }

  if (linksOk) {
    console.log("✓ PDF links verified");
  }

  console.log("\nFILES:");
  console.log(rel(free.pdfPath));
  console.log(rel(plan.pdfPath));

  if (!fs.existsSync(free.pdfPath) || !fs.existsSync(plan.pdfPath)) {
    process.exit(1);
  }
}

main().catch((error) => {
  printValidationError(error);
});
