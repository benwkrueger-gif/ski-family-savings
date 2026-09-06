import fs from "fs";
import path from "path";
import { compileReportCss, generateReport, PROJECT_ROOT, readArg, type ReportType } from "./render-report";
import { extractPdf, renderQaPngs, runChecks, type QaCheck } from "./pdf-qa";
import { printValidationError } from "../validate-report";

async function main() {
  const dataPath = readArg("data", "reports/examples/ben.json");
  if (!dataPath) throw new Error("Missing --data");

  const css = compileReportCss();
  const types: ReportType[] = ["free", "full"];
  const allChecks: QaCheck[] = [];

  for (const type of types) {
    const generated = await generateReport({ dataPath, type, css });
    const exists = fs.existsSync(generated.pdfPath);
    allChecks.push({
      ok: exists,
      message: `${type}: PDF exists at ${generated.pdfPath}`,
    });

    const extracted = await extractPdf(generated.pdfPath);
    const qaDir = path.join(PROJECT_ROOT, "reports/qa", type);
    const pngCount = await renderQaPngs(generated.pdfPath, qaDir);
    console.log(`Wrote ${pngCount} QA page(s) to ${qaDir}`);
    allChecks.push(...runChecks(type, generated.data, extracted, pngCount));
  }

  const failed = allChecks.filter((check) => !check.ok);
  for (const check of allChecks) {
    console.log(`${check.ok ? "PASS" : "FAIL"}  ${check.message}`);
  }

  if (failed.length > 0) {
    console.error(`\n${failed.length} check(s) failed.`);
    process.exit(1);
  }

  console.log(`\n${allChecks.length} checks passed.`);
}

main().catch((error) => {
  printValidationError(error);
});
