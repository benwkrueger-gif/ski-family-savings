import fs from "fs";
import path from "path";
import { htmlDocument, outputName, renderReportBody, type ReportType } from "./render-html";
import type { ReportData } from "./schema";
import { serverlessChromiumPackUrl } from "./chromium-pack";

export type { ReportType };

function bundledReportAssets() {
  return {
    hero: `data:image/jpeg;base64,${fs.readFileSync(path.join(process.cwd(), "public/hero.jpg")).toString("base64")}`,
    ctaFamily: `data:image/jpeg;base64,${fs.readFileSync(path.join(process.cwd(), "public/cta-family.jpg")).toString("base64")}`,
    founder: `data:image/jpeg;base64,${fs.readFileSync(path.join(process.cwd(), "public/founder.jpg")).toString("base64")}`,
  };
}

function isServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

let cachedCss: string | undefined;

async function loadReportCss(): Promise<string> {
  if (cachedCss) return cachedCss;
  const generated = path.join(process.cwd(), "reports/styles/report.generated.css");
  if (fs.existsSync(generated)) {
    cachedCss = fs.readFileSync(generated, "utf8");
    return cachedCss;
  }
  if (isServerless()) {
    throw new Error("Missing reports/styles/report.generated.css");
  }
  const { compileReportCss } = await import("./compile-report-css");
  cachedCss = compileReportCss({ quiet: true });
  return cachedCss;
}

export async function generateReportPdfBuffer(options: {
  data: ReportData;
  type: ReportType;
  css?: string;
}): Promise<{ bytes: Buffer; filename: string; title: string }> {
  const css = options.css ?? (await loadReportCss());
  const filename = `${outputName(options.data.family, options.type)}.pdf`;
  const title =
    options.type === "free"
      ? `${options.data.family.firstName} - Free Ski Family Savings Scan`
      : `${options.data.family.firstName} - Ski Family Savings Plan`;
  const html = htmlDocument(
    title,
    css,
    renderReportBody(options.type, options.data, bundledReportAssets()),
  );

  if (isServerless()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;
    chromium.setGraphicsMode = false;
    let browser;
    try {
      browser = await puppeteer.launch({
        args: chromium.args,
        executablePath: await chromium.executablePath(serverlessChromiumPackUrl()),
        headless: "shell",
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Chromium/Puppeteer startup failed: ${detail}`);
    }
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

  const { chromium } = await import("playwright");
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
