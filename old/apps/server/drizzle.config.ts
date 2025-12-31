import { defineConfig } from "drizzle-kit";
import "dotenv/config";

// Use process.env directly - drizzle-kit only needs DATABASE_URL
// Don't import from env.ts as it validates ALL env vars
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: "supabase",
    table: "__drizzle_migrations__",
    schema: "public",
  },
});
