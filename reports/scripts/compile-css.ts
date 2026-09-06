import fs from "fs";
import path from "path";
import { compileReportCss } from "../compile-report-css";

const output = path.join(process.cwd(), "reports/styles/report.generated.css");

fs.mkdirSync(path.dirname(output), { recursive: true });
const css = compileReportCss({ quiet: true });
fs.writeFileSync(output, css);
console.log(`Wrote ${path.relative(process.cwd(), output)}`);
