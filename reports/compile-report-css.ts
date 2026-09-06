import { execSync } from "child_process";
import fs from "fs";
import path from "path";

export function compileReportCss(options?: { quiet?: boolean }): string {
  const input = path.join(process.cwd(), "reports/styles/input.css");
  const output = path.join(process.cwd(), "reports/output/report.css");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  try {
    execSync(`npx @tailwindcss/cli -i "${input}" -o "${output}"`, {
      cwd: process.cwd(),
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
