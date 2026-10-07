import { defineConfig } from "drizzle-kit";

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
