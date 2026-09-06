import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { chromium } from "playwright";
import { fileAssets } from "../assets";
import { compileReportCss } from "../compile-report-css";
import { loadReport } from "../load-report";
import { htmlDocument, outputName, renderReportBody, type ReportType } from "../render-html";
import type { ReportData } from "../schema";

export const PROJECT_ROOT = process.cwd();

export type { ReportType };
export { compileReportCss, htmlDocument, renderReportBody, outputName };

export function readArg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) {
    return process.argv[index + 1];
  }
  return fallback;
}

export async function generateReport(options: {
  dataPath?: string;
  data?: ReportData;
  type: ReportType;
  css?: string;
  quietCss?: boolean;
}): Promise<{ htmlPath: string; pdfPath: string; data: ReportData; name: string }> {
  const data = options.data ?? (options.dataPath ? loadReport(options.dataPath) : undefined);
  if (!data) throw new Error("generateReport requires --data or a parsed report");

  const css = options.css ?? compileReportCss({ quiet: options.quietCss });
  const name = outputName(data.family, options.type);
  const outDir = path.join(PROJECT_ROOT, "reports/output");
  fs.mkdirSync(outDir, { recursive: true });

  const title =
    options.type === "free"
      ? `${data.family.firstName} — Free Ski Family Savings Scan`
      : `${data.family.firstName} — Ski Family Savings Plan`;

  const htmlPath = path.join(outDir, `${name}.html`);
  const pdfPath = path.join(outDir, `${name}.pdf`);
  fs.writeFileSync(htmlPath, htmlDocument(title, css, renderReportBody(options.type, data, fileAssets(PROJECT_ROOT))));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.pdf({
    path: pdfPath,
    format: "Letter",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });
  await browser.close();

  return { htmlPath, pdfPath, data, name };
}
