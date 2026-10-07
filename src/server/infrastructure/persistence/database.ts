import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { readEnvironment } from "@/server/config/environment.config";

export type Database = PostgresJsDatabase<typeof schema>;

type DatabaseSingleton = {
  client?: ReturnType<typeof postgres>;
  database?: Database;
};

declare global {
  var raroTicketsDatabase: DatabaseSingleton | undefined;
}

export function getDatabase(): Database {
  const environment = readEnvironment();
  if (!environment.databaseUrl) throw new Error("DATABASE_URL não configurada. Copie .env.example e configure o PostgreSQL.");
  const singleton = globalThis.raroTicketsDatabase ?? {};
  if (singleton.database) return singleton.database;
  const client = postgres(environment.databaseUrl, { max: 10, prepare: false, idle_timeout: 20, connect_timeout: 10 });
  const database = drizzle(client, { schema });
  globalThis.raroTicketsDatabase = { client, database };
  return database;
}

export async function closeDatabase(): Promise<void> {
  await globalThis.raroTicketsDatabase?.client?.end({ timeout: 5 });
  globalThis.raroTicketsDatabase = undefined;
}
