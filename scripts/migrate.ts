import fs from "fs";
import path from "path";
import { loadEnvConfig } from "@next/env";
import { neon } from "@neondatabase/serverless";

loadEnvConfig(process.cwd());

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = neon(url);
  const dir = path.join(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  let applied = 0;
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const statements = raw
      .split(/;\s*\n/)
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0 && !statement.startsWith("--"));
    for (const statement of statements) {
      await sql.query(statement.endsWith(";") ? statement : `${statement};`);
      applied += 1;
    }
    console.log(`Applied ${file}`);
  }
  console.log(`Applied ${applied} statements from ${files.length} migration files`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
