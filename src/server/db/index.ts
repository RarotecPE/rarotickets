import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { env } from "@/server/config/env";
import * as schema from "./schema";

const client = postgres(env.databaseUrl, { max: 10 });
export const db = drizzle(client, { schema });
export { schema };
export { client as pgClient };
