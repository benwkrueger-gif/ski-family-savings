import { compileReportCss, generateReport, readArg, type ReportType } from "./render-report";
import { printValidationError } from "../validate-report";

async function main() {
  const dataPath = readArg("data", "reports/examples/ben.json");
  if (!dataPath) throw new Error("Missing --data");

  const typeArg = readArg("type", "both") ?? "both";
  if (typeArg !== "free" && typeArg !== "full" && typeArg !== "both") {
    throw new Error(`Unknown --type ${typeArg}. Use free, full, or both.`);
  }

  const types: ReportType[] = typeArg === "both" ? ["free", "full"] : [typeArg];
  const css = compileReportCss();

  for (const type of types) {
    const result = await generateReport({ dataPath, type, css });
    console.log(`Wrote ${result.pdfPath}`);
    console.log(`Wrote ${result.htmlPath}`);
  }
}

main().catch((error) => {
  printValidationError(error);
});
