#!/usr/bin/env node
/**
 * Run migration 35 against your Supabase Postgres database.
 *
 * Set DATABASE_URL in .env.local (from Supabase → Project Settings → Database → Connection string):
 *   DATABASE_URL=postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
 *
 * Then: node scripts/run-35-migration.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const envPath = join(__dirname, "..", ".env.local");
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^DATABASE_URL=(.+)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
  return null;
}

const databaseUrl = loadDatabaseUrl();
if (!databaseUrl) {
  console.error(
    "Missing DATABASE_URL. Add it to .env.local or export it, then re-run.\n" +
      "Supabase → Project Settings → Database → Connection string (URI)."
  );
  process.exit(1);
}

const sql = readFileSync(join(__dirname, "35_tasks_payment_mode.sql"), "utf8");
const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  await client.query(sql);
  console.log("Migration 35 applied successfully.");
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
