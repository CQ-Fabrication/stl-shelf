import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { runMigrations, type MigrationFile } from "@/lib/db/migrations";

/**
 * Production migration runner: `bun run db:migrate` (also runs as part of
 * `bun start` before the server binds). See src/lib/db/migrations.ts for why
 * this exists instead of `drizzle-kit migrate`.
 */

const drizzleDir = fileURLToPath(new URL("../drizzle", import.meta.url));

interface JournalEntry {
  idx: number;
  when: number;
  tag: string;
}

function readJournal(): MigrationFile[] {
  const journalPath = `${drizzleDir}/meta/_journal.json`;
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as {
    entries: JournalEntry[];
  };

  return [...journal.entries]
    .sort((a, b) => a.idx - b.idx)
    .map((entry) => {
      const sql = readFileSync(`${drizzleDir}/${entry.tag}.sql`, "utf8");
      return {
        tag: entry.tag,
        whenMs: entry.when,
        hash: createHash("sha256").update(sql).digest("hex"),
        sql,
      };
    });
}

function failLoudly(error: unknown): never {
  const banner = "!".repeat(72);
  console.error(`\n${banner}`);
  console.error("!!!  DATABASE MIGRATION FAILED — DO NOT SERVE TRAFFIC");
  console.error("!!!  The schema may be behind the deployed code.");
  console.error("!!!  Fix the migration, then redeploy (bun start reruns it).");
  console.error(banner);
  console.error(error);
  console.error(`${banner}\n`);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  failLoudly(new Error("DATABASE_URL environment variable is required"));
}

const sql = postgres(databaseUrl, { max: 1, prepare: false, onnotice: () => {} });

try {
  const { applied } = await runMigrations(sql, readJournal());
  if (applied.length === 0) {
    console.log("[migrate] database is up to date");
  } else {
    console.log(`[migrate] applied ${applied.length} migration(s): ${applied.join(", ")}`);
  }
} catch (error) {
  failLoudly(error);
} finally {
  await sql.end();
}
