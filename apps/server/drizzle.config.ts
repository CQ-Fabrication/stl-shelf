import { defineConfig } from "drizzle-kit";
import "dotenv/config";
import { env } from "./src/env";

export default defineConfig({
  schema: "./src/db/schema",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
  migrations: {
    prefix: "supabase",
    table: "__drizzle_migrations__",
    schema: "public",
  },
});
