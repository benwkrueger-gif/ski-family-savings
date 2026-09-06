import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { pathToFileURL } from "url";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { dataUriAssets, fileAssets, type ReportAssets } from "../assets";
import { reportFileStem } from "../filenames";
import { loadReport } from "../load-report";
import { FreeScanReport } from "../templates/FreeScanReport";
import { FullReport } from "../templates/FullReport";
import type { ReportData } from "../schema";

export const PROJECT_ROOT = process.cwd();

export type ReportType = "free" | "full";

export function readArg(name: string, fallback?: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0 && process.argv[index + 1] && !process.argv[index + 1].startsWith("--")) {
    return process.argv[index + 1];
  }
  return fallback;
}

export function outputName(family: ReportData["family"], type: ReportType): string {
  return reportFileStem(family, type === "free" ? "scan" : "plan");
}

export function compileReportCss(options?: { quiet?: boolean }): string {
  const input = path.join(PROJECT_ROOT, "reports/styles/input.css");
  const output = path.join(PROJECT_ROOT, "reports/output/report.css");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  try {
    execSync(`npx @tailwindcss/cli -i "${input}" -o "${output}"`, {
      cwd: PROJECT_ROOT,
      stdio: options?.quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      encoding: "utf8",
    });
  } catch (error) {
    const err = error as { stderr?: string; message?: string };
    if (err.stderr) console.error(err.stderr);
    throw error;
  }
  return fs.readFileSync(output, "utf8");
}

export function htmlDocument(title: string, css: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Oswald:wght@500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --font-oswald: "Oswald", ui-sans-serif, system-ui, sans-serif;
      --font-barlow: "Barlow", ui-sans-serif, system-ui, sans-serif;
      --font-display: var(--font-oswald);
      --font-body: var(--font-barlow);
    }
    ${css}
  </style>
</head>
<body class="report-preview-body min-h-full bg-background font-sans text-text antialiased">
  <div class="report-preview-frame">${body}</div>
</body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

export function renderReportBody(
  type: ReportType,
  data: ReportData,
  assets: ReportAssets = fileAssets(PROJECT_ROOT),
): string {
  return type === "free"
    ? renderToStaticMarkup(<FreeScanReport data={data} assets={assets} />)
    : renderToStaticMarkup(<FullReport data={data} assets={assets} />);
}

let cachedCss: string | undefined;

export function loadReportCss(): string {
  if (cachedCss) return cachedCss;
  const generated = path.join(PROJECT_ROOT, "reports/styles/report.generated.css");
  if (fs.existsSync(generated)) {
    cachedCss = fs.readFileSync(generated, "utf8");
    return cachedCss;
  }
  cachedCss = compileReportCss({ quiet: true });
  return cachedCss;
}

function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

export async function generateReportPdfBuffer(options: {
  data: ReportData;
  type: ReportType;
  css?: string;
}): Promise<{ bytes: Buffer; filename: string; title: string }> {
  const css = options.css ?? loadReportCss();
  const filename = `${outputName(options.data.family, options.type)}.pdf`;
  const title =
    options.type === "free"
      ? `${options.data.family.firstName} - Free Ski Family Savings Scan`
      : `${options.data.family.firstName} - Ski Family Savings Plan`;
  const html = htmlDocument(
    title,
    css,
    renderReportBody(options.type, options.data, dataUriAssets(PROJECT_ROOT)),
  );

  if (isServerless()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "load", timeout: 60_000 });
      await page.evaluate(async () => {
        await document.fonts.ready;
      });
      const bytes = Buffer.from(
        await page.pdf({
          format: "Letter",
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: false,
          margin: { top: "0", right: "0", bottom: "0", left: "0" },
        }),
      );
      return { bytes, filename, title };
    } finally {
      await browser.close();
    }
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle", timeout: 60_000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const bytes = Buffer.from(
      await page.pdf({
        format: "Letter",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      }),
    );
    return { bytes, filename, title };
  } finally {
    await browser.close();
  }
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
  fs.writeFileSync(htmlPath, htmlDocument(title, css, renderReportBody(options.type, data)));

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
