import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { env } from "@/lib/env";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (cached) return cached;
  cached = drizzle(neon(env.databaseUrl()), { schema });
  return cached;
}
