import { createRequire } from "node:module";
import { createElement, type ReactElement } from "react";
import { FreeScanReport } from "./templates/FreeScanReport";
import { FullReport } from "./templates/FullReport";
import type { ReportAssets } from "./assets";
import { reportFileStem } from "./filenames";
import type { ReportData } from "./schema";

export type ReportType = "free" | "full";

const requireFromReport = createRequire(import.meta.url);

function renderToStaticMarkup(element: ReactElement): string {
  const { renderToStaticMarkup: render } = requireFromReport("react-dom/server") as {
    renderToStaticMarkup: (element: ReactElement) => string;
  };
  return render(element);
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

export function outputName(family: ReportData["family"], type: ReportType): string {
  return reportFileStem(family, type === "free" ? "scan" : "plan");
}

export function renderReportBody(type: ReportType, data: ReportData, assets: ReportAssets): string {
  return type === "free"
    ? renderToStaticMarkup(createElement(FreeScanReport, { data, assets }))
    : renderToStaticMarkup(createElement(FullReport, { data, assets }));
}
