import fs from "fs";
import path from "path";
import { parseReport, type ReportData } from "./schema";
import { prepareReport, ReportValidationError } from "./validate-report";

export const DATA_DIR = path.join(process.cwd(), "reports/data");

export function loadReport(filePath: string): ReportData {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolute)) {
    throw new ReportValidationError(`Could not find JSON file:\n- ${filePath}`);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(absolute, "utf8")) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON error";
    throw new ReportValidationError(`JSON is invalid:\n- ${message}`);
  }

  return prepareReport(raw);
}

export function loadExampleReport(): ReportData {
  return parseReport(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "reports/examples/ben.json"), "utf8")),
  );
}

export function findLatestReportJson(dir = DATA_DIR): string {
  if (!fs.existsSync(dir)) {
    throw new ReportValidationError(
      `No JSON files in reports/data/\n- Save a completed customer JSON into reports/data/ first.`,
    );
  }

  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const filePath = path.join(dir, name);
      return { filePath, mtime: fs.statSync(filePath).mtimeMs };
    })
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    throw new ReportValidationError(
      `No JSON files in reports/data/\n- Save a completed customer JSON into reports/data/ first.`,
    );
  }

  return files[0].filePath;
}
