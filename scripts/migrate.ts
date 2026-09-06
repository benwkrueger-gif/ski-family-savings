import fs from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required");
  const sql = neon(url);
  const file = path.join(process.cwd(), "drizzle/0001_init.sql");
  const raw = fs.readFileSync(file, "utf8");
  const statements = raw
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith("--"));

  for (const statement of statements) {
    await sql.query(statement.endsWith(";") ? statement : `${statement};`);
  }
  console.log(`Applied ${statements.length} statements from drizzle/0001_init.sql`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
