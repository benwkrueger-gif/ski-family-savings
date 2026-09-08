import fs from "fs";
import path from "path";
import { pathToFileURL } from "node:url";
import { pdf } from "pdf-to-img";
import { PROJECT_ROOT, type ReportType } from "./render-report";
import type { ReportData } from "../schema";
import { writingVoiceIssues } from "../../lib/copy/banned";

async function loadPdfjs() {
  const pdfjsEntry = path.join(
    PROJECT_ROOT,
    "node_modules/pdf-to-img/node_modules/pdfjs-dist/legacy/build/pdf.mjs",
  );
  return import(pathToFileURL(pdfjsEntry).href);
}

export type QaCheck = { ok: boolean; message: string; kind?: "link" };

export type ExtractedPdf = {
  pageCount: number;
  pages: { text: string; urls: string[] }[];
  allText: string;
  allUrls: string[];
};

export async function extractPdf(pdfPath: string): Promise<ExtractedPdf> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const loadingTask = pdfjs.getDocument({
    data,
    isEvalSupported: false,
    disableFontFace: true,
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;
  const pages: { text: string; urls: string[] }[] = [];

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item: { str?: string }) => ("str" in item ? item.str : ""))
      .join(" ");
    const annotations = await page.getAnnotations();
    const urls = annotations
      .map((annotation: { url?: string; unsafeUrl?: string }) => {
        const url = annotation.url || annotation.unsafeUrl;
        return typeof url === "string" ? url : "";
      })
      .filter(Boolean);
    pages.push({ text, urls });
    page.cleanup();
  }

  const allText = pages.map((page) => page.text).join("\n");
  const allUrls = pages.flatMap((page) => page.urls);
  return { pageCount: pages.length, pages, allText, allUrls };
}

export async function renderQaPngs(pdfPath: string, outDir: string) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const document = await pdf(pdfPath, { scale: 2 });
  let index = 1;
  for await (const image of document) {
    fs.writeFileSync(path.join(outDir, `page-${index}.png`), image);
    index += 1;
  }
  await document.destroy();
  return index - 1;
}

export function runChecks(
  type: ReportType,
  data: ReportData,
  extracted: ExtractedPdf,
  pngCount: number,
): QaCheck[] {
  const checks: QaCheck[] = [];
  checks.push({
    ok: extracted.pageCount > 0,
    message: `${type}: PDF has ${extracted.pageCount} page(s)`,
  });
  checks.push({
    ok: pngCount === extracted.pageCount,
    message: `${type}: QA PNGs (${pngCount}) match page count (${extracted.pageCount})`,
  });

  const emptyPages = extracted.pages
    .map((page, index) => ({ index: index + 1, text: page.text.replace(/\s+/g, "") }))
    .filter((page) => page.text.length < 20);
  checks.push({
    ok: emptyPages.length === 0,
    message:
      emptyPages.length === 0
        ? `${type}: no empty pages`
        : `${type}: empty pages: ${emptyPages.map((page) => page.index).join(", ")}`,
  });

  const reportId = data.report.reportId;
  if (reportId && /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(reportId)) {
    checks.push({
      ok: !extracted.allText.includes(reportId),
      message: extracted.allText.includes(reportId)
        ? `${type}: internal report UUID leaked into PDF text`
        : `${type}: no internal report UUID in PDF text`,
    });
  }

  const voice = writingVoiceIssues(extracted.allText);
  checks.push({
    ok: voice.length === 0,
    message:
      voice.length === 0
        ? `${type}: no robotic third-person or research-audit language`
        : `${type}: voice flags: ${voice.join(", ")}`,
  });

  if (!data.freeScan?.cta) {
    checks.push({
      ok: !/\$49/.test(extracted.allText),
      message: /\$49/.test(extracted.allText)
        ? `${type}: $49 language present without an upsell CTA`
        : `${type}: no $49 language`,
    });
  }

  if (type === "free") {
    checks.push({
      ok: extracted.pageCount >= 1 && extracted.pageCount <= 3,
      message: `free: expected 1-3 pages, got ${extracted.pageCount}`,
    });
    const ctaUrl = data.freeScan?.cta?.url;
    if (ctaUrl) {
      const found = extracted.allUrls.some((url) => url.includes(ctaUrl)) || extracted.allText.includes(ctaUrl);
      checks.push({
        ok: found,
        kind: "link",
        message: found ? `free: CTA URL present (${ctaUrl})` : `free: missing CTA URL ${ctaUrl}`,
      });
    }
  }

  if (type === "full") {
    for (const opportunity of data.opportunities) {
      const found = extracted.allText.includes(opportunity.title);
      checks.push({
        ok: found,
        message: found
          ? `full: found opportunity “${opportunity.title}”`
          : `full: missing opportunity title “${opportunity.title}”`,
      });
    }

    const sourceUrls = [
      ...data.opportunities.flatMap((item) => [
        item.source?.url,
        ...(item.sources ?? []).map((source) => source.url),
      ]),
      ...data.watch.map((item) => item.source?.url),
      ...data.knownSavings.map((item) => item.source?.url),
      ...(data.strategy?.steps ?? []).map((item) => item.source?.url),
      ...data.sources.map((item) => item.url),
    ].filter((url): url is string => Boolean(url));

    const uniqueUrls = [...new Set(sourceUrls)];

    for (const url of uniqueUrls) {
      const found = extracted.allUrls.some((item) => item.includes(url)) || extracted.allText.includes(url);
      checks.push({
        ok: found,
        kind: "link",
        message: found ? `full: source URL present (${url})` : `full: missing source URL ${url}`,
      });
    }

    const hasUpsell = /\$99|Ski Savings Watch|Keep watching/i.test(extracted.allText);
    checks.push({
      ok: !hasUpsell,
      message: hasUpsell ? "full: Watch upsell copy is still present" : "full: Watch upsell removed",
    });

    if (data.thankYou?.enabled) {
      const headline = data.thankYou.headline ?? "Thanks for testing this out.";
      checks.push({
        ok: extracted.allText.includes(headline),
        message: extracted.allText.includes(headline)
          ? "full: personal thank-you present"
          : "full: missing personal thank-you",
      });
    }
  }

  return checks;
}
