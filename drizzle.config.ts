import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/server/infrastructure/persistence/schema.ts",
  out: "./src/server/infrastructure/persistence/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/rarotickets",
  },
  strict: true,
  verbose: true,
});
